import Foundation
import UIKit
import Capacitor
import Speech
import AVFoundation

@objc(SpeechRecognitionPlugin)
public class SpeechRecognitionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpeechRecognitionPlugin"
    public let jsName = "SpeechRecognition"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private var speechRecognizer: SFSpeechRecognizer?
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var latestTranscript: String = ""
    private var interruptionObserver: NSObjectProtocol?
    private var routeChangeObserver: NSObjectProtocol?
    private var backgroundObserver: NSObjectProtocol?
    private var isStarting: Bool = false
    private var isTornDown: Bool = false

    @objc func available(_ call: CAPPluginCall) {
        guard let recognizer = SFSpeechRecognizer() else {
            call.resolve(["available": false])
            return
        }
        call.resolve(["available": recognizer.isAvailable])
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        let status = SFSpeechRecognizer.authorizationStatus()
        let permission: String
        switch status {
        case .authorized: permission = "granted"
        case .denied, .restricted: permission = "denied"
        case .notDetermined: permission = "prompt"
        @unknown default: permission = "prompt"
        }
        call.resolve(["speechRecognition": permission])
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                guard let self = self else { return }
                switch status {
                case .authorized:
                    self.requestMicPermission { granted in
                        call.resolve(["speechRecognition": granted ? "granted" : "denied"])
                    }
                case .denied, .restricted:
                    call.resolve(["speechRecognition": "denied"])
                case .notDetermined:
                    call.resolve(["speechRecognition": "prompt"])
                @unknown default:
                    call.resolve(["speechRecognition": "prompt"])
                }
            }
        }
    }

    private func requestMicPermission(_ completion: @escaping (Bool) -> Void) {
        if #available(iOS 17.0, *) {
            AVAudioApplication.requestRecordPermission { granted in
                DispatchQueue.main.async { completion(granted) }
            }
        } else {
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async { completion(granted) }
            }
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        if isStarting || (audioEngine?.isRunning ?? false) {
            call.reject("Recording already in progress")
            return
        }

        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            call.reject("Speech recognition permission not granted")
            return
        }

        isStarting = true
        isTornDown = false

        let language = call.getString("language") ?? "en-US"
        let partialResults = call.getBool("partialResults") ?? true

        requestMicPermission { [weak self] granted in
            guard let self = self else { return }
            guard granted else {
                self.isStarting = false
                call.reject("Microphone permission not granted")
                return
            }
            DispatchQueue.main.async {
                self.startRecording(language: language, partialResults: partialResults, call: call)
            }
        }
    }

    private func startRecording(language: String, partialResults: Bool, call: CAPPluginCall) {
        cancelExistingTask()
        latestTranscript = ""

        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language)) else {
            isStarting = false
            call.reject("Speech recognizer not available for locale: \(language)")
            return
        }
        guard recognizer.isAvailable else {
            isStarting = false
            call.reject("Speech recognizer not available right now")
            return
        }

        speechRecognizer = recognizer

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker])
            try session.setActive(true)
        } catch {
            isStarting = false
            call.reject("Failed to configure audio session: \(error.localizedDescription)")
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = partialResults
        recognitionRequest = request

        let engine = AVAudioEngine()
        audioEngine = engine
        let inputNode = engine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }

            if let result = result {
                let best = result.bestTranscription.formattedString
                self.latestTranscript = best
                self.notifyListeners("partialResults", data: ["matches": [best]])
                if result.isFinal {
                    self.tearDown()
                }
            }

            if let error = error {
                let nsError = error as NSError
                // Benign codes from Apple's speech-recognition domain:
                //   1110 = "No speech detected"
                //   203  = "Retry"
                //   216  = "Session canceled" (fires when we intentionally cancel)
                let benign: Set<Int> = [1110, 203, 216]
                let isBenign = nsError.domain == "kAFAssistantErrorDomain" && benign.contains(nsError.code)
                if !isBenign {
                    self.notifyListeners("error", data: ["message": error.localizedDescription])
                }
                self.tearDown()
            }
        }

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        engine.prepare()
        do {
            try engine.start()
            attachAudioObservers()
            isStarting = false
            call.resolve()
        } catch {
            tearDown()
            isStarting = false
            call.reject("Failed to start audio engine: \(error.localizedDescription)")
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        let transcript = latestTranscript
        DispatchQueue.main.async { [weak self] in
            self?.tearDown()
            call.resolve(["matches": transcript.isEmpty ? [] : [transcript]])
        }
    }

    private func cancelExistingTask() {
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
    }

    private func tearDown() {
        guard !isTornDown else { return }
        isTornDown = true

        if let engine = audioEngine {
            if engine.isRunning {
                engine.stop()
            }
            engine.inputNode.removeTap(onBus: 0)
        }
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        audioEngine = nil

        detachAudioObservers()

        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func attachAudioObservers() {
        let center = NotificationCenter.default

        interruptionObserver = center.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self = self,
                  let userInfo = notification.userInfo,
                  let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
                return
            }
            if type == .began {
                self.notifyListeners("error", data: ["message": "Audio interrupted"])
                self.tearDown()
            }
        }

        routeChangeObserver = center.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self = self,
                  let userInfo = notification.userInfo,
                  let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
                  let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
                return
            }
            if reason == .oldDeviceUnavailable {
                self.notifyListeners("error", data: ["message": "Audio device disconnected"])
                self.tearDown()
            }
        }

        backgroundObserver = center.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            self.notifyListeners("error", data: ["message": "Recording stopped"])
            self.tearDown()
        }
    }

    private func detachAudioObservers() {
        let center = NotificationCenter.default
        if let obs = interruptionObserver {
            center.removeObserver(obs)
            interruptionObserver = nil
        }
        if let obs = routeChangeObserver {
            center.removeObserver(obs)
            routeChangeObserver = nil
        }
        if let obs = backgroundObserver {
            center.removeObserver(obs)
            backgroundObserver = nil
        }
    }

    deinit {
        tearDown()
    }
}
