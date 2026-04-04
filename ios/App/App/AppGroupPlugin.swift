import Capacitor

@objc(AppGroupPlugin)
public class AppGroupPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppGroupPlugin"
    public let jsName = "AppGroup"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]

    private let suiteName = "group.app.lesalon"

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"),
              let value = call.getString("value") else {
            call.reject("Missing key or value")
            return
        }

        let defaults = UserDefaults(suiteName: suiteName)
        defaults?.set(value, forKey: key)
        defaults?.synchronize()
        call.resolve()
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Missing key")
            return
        }

        let defaults = UserDefaults(suiteName: suiteName)
        let value = defaults?.string(forKey: key)
        call.resolve(["value": value as Any])
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Missing key")
            return
        }

        let defaults = UserDefaults(suiteName: suiteName)
        defaults?.removeObject(forKey: key)
        defaults?.synchronize()
        call.resolve()
    }
}
