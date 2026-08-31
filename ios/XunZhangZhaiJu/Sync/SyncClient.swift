import Foundation

enum SyncClientError: LocalizedError {
    case notConfigured
    case invalidResponse
    case rejected(Int, String)

    var errorDescription: String? {
        switch self {
        case .notConfigured: "同步服務尚未填入正式網址"
        case .invalidResponse: "同步服務回傳了無法辨識的資料"
        case let .rejected(status, message): "同步服務拒絕請求（\(status)）：\(message)"
        }
    }
}

struct SyncClient: Sendable {
    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(session: URLSession = .shared) {
        self.session = session
        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
    }

    func exchange(
        provider: IdentityProvider,
        idToken: String,
        nonce: String?,
        baseURL: URL
    ) async throws -> BackendSession {
        struct Body: Encodable { let provider: String; let idToken: String; let nonce: String? }
        var request = URLRequest(url: baseURL.appending(path: "v1/auth/exchange"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(Body(provider: provider.rawValue, idToken: idToken, nonce: nonce))
        let response: AuthExchangeResponse = try await perform(request)
        return BackendSession(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            userID: response.userID,
            accessExpiresAt: Date().addingTimeInterval(response.expiresIn),
            refreshExpiresAt: Date().addingTimeInterval(response.refreshExpiresIn)
        )
    }

    func refresh(_ refreshToken: String, baseURL: URL) async throws -> BackendSession {
        struct Body: Encodable { let refreshToken: String }
        var request = URLRequest(url: baseURL.appending(path: "v1/auth/refresh"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(Body(refreshToken: refreshToken))
        let response: AuthExchangeResponse = try await perform(request)
        return BackendSession(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            userID: response.userID,
            accessExpiresAt: Date().addingTimeInterval(response.expiresIn),
            refreshExpiresAt: Date().addingTimeInterval(response.refreshExpiresIn)
        )
    }

    func sync(
        _ body: SyncRequestEnvelope,
        sessionToken: String,
        baseURL: URL
    ) async throws -> SyncResponseEnvelope {
        var request = URLRequest(url: baseURL.appending(path: "v1/sync"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try encoder.encode(body)
        return try await perform(request)
    }

    func exportAccount(sessionToken: String, baseURL: URL) async throws -> Data {
        var request = URLRequest(url: baseURL.appending(path: "v1/account/export"))
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        return try await performData(request)
    }

    func deleteAccount(sessionToken: String, baseURL: URL) async throws {
        var request = URLRequest(url: baseURL.appending(path: "v1/account"))
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        request.setValue("DELETE", forHTTPHeaderField: "X-Confirm-Delete")
        _ = try await performData(request)
    }

    private func perform<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let data = try await performData(request)
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw SyncClientError.invalidResponse
        }
    }

    private func performData(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw SyncClientError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data).error) ?? "未知錯誤"
            throw SyncClientError.rejected(http.statusCode, message)
        }
        return data
    }
}

private struct ErrorBody: Decodable {
    let error: String
}
