import CryptoKit
import Foundation
import Security

enum AuthNonceError: LocalizedError {
    case randomGeneration(OSStatus)

    var errorDescription: String? {
        switch self {
        case let .randomGeneration(status): "無法建立安全登入碼（OSStatus \(status)）"
        }
    }
}

enum AuthNonce {
    static func make(byteCount: Int = 32) throws -> (raw: String, hash: String) {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        guard status == errSecSuccess else { throw AuthNonceError.randomGeneration(status) }
        let raw = Data(bytes).base64EncodedString()
        let digest = SHA256.hash(data: Data(raw.utf8))
        return (raw, digest.map { String(format: "%02x", $0) }.joined())
    }
}
