import Foundation

final class PersistenceService {
    static let shared = PersistenceService()

    private let defaults: UserDefaults
    private let key = "paypace.app.store.v1"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func load() -> AppStore {
        guard let data = defaults.data(forKey: key) else { return .empty }
        do {
            return try JSONDecoder.payPace.decode(AppStore.self, from: data)
        } catch {
            return .empty
        }
    }

    func save(_ store: AppStore) {
        do {
            let data = try JSONEncoder.payPace.encode(store)
            defaults.set(data, forKey: key)
        } catch {
            // Persistence failures should not crash the MVP.
        }
    }
}

extension JSONEncoder {
    static let payPace: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()
}

extension JSONDecoder {
    static let payPace: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}
