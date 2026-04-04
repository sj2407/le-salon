import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    private let appGroupId = "group.app.lesalon"
    private let apiUrl = "https://luodxtcsrgrflfgtwrnx.supabase.co/functions/v1/share-intake"

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        handleSharedContent()
    }

    private func handleSharedContent() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            close(withError: "No content to share")
            return
        }

        for item in extensionItems {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] item, error in
                        guard let url = item as? URL else {
                            self?.close(withError: "Could not read URL")
                            return
                        }
                        self?.shareUrl(url.absoluteString)
                    }
                    return
                }
                if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] item, error in
                        guard let text = item as? String,
                              let url = URL(string: text), url.scheme?.hasPrefix("http") == true else {
                            self?.close(withError: "No URL found in shared text")
                            return
                        }
                        self?.shareUrl(text)
                    }
                    return
                }
            }
        }

        close(withError: "No URL found")
    }

    private func shareUrl(_ urlString: String) {
        guard let token = getToken() else {
            close(withError: "Open Le Salon first to set up sharing")
            return
        }

        var request = URLRequest(url: URL(string: apiUrl)!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15

        let body: [String: Any] = ["url": urlString]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.close(withError: "Failed to share: \(error.localizedDescription)")
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse else {
                    self?.close(withError: "No response from server")
                    return
                }

                if httpResponse.statusCode == 200 {
                    var title = "Link"
                    if let data = data,
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let responseTitle = json["title"] as? String {
                        title = responseTitle
                    }
                    self?.close(withSuccess: "Shared to Le Salon: \(title)")
                } else if httpResponse.statusCode == 401 {
                    self?.close(withError: "Token expired — regenerate in Le Salon settings")
                } else if httpResponse.statusCode == 429 {
                    self?.close(withError: "Too many shares — try again later")
                } else {
                    self?.close(withError: "Server error (\(httpResponse.statusCode))")
                }
            }
        }.resume()
    }

    private func getToken() -> String? {
        let defaults = UserDefaults(suiteName: appGroupId)
        return defaults?.string(forKey: "share_token")
    }

    private func close(withSuccess message: String) {
        let alert = UIAlertController(title: "✓", message: message, preferredStyle: .alert)
        present(alert, animated: true) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
                self?.extensionContext?.completeRequest(returningItems: nil)
            }
        }
    }

    private func close(withError message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
            self?.extensionContext?.cancelRequest(withError: NSError(domain: "app.lesalon.share", code: 0, userInfo: [NSLocalizedDescriptionKey: message]))
        })
        present(alert, animated: true)
    }
}
