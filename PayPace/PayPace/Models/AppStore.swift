import Foundation

struct AppSettings: Codable, Equatable {
    var hasCompletedOnboarding: Bool
    var currencyCode: String
    var notificationsEnabled: Bool
    var morningReminderEnabled: Bool
    var billRemindersEnabled: Bool
    var paceWarningsEnabled: Bool
    var isPremium: Bool
    var morningReminderHour: Int

    static let `default` = AppSettings(
        hasCompletedOnboarding: false,
        currencyCode: "PLN",
        notificationsEnabled: false,
        morningReminderEnabled: true,
        billRemindersEnabled: true,
        paceWarningsEnabled: true,
        isPremium: false,
        morningReminderHour: 8
    )
}

struct AppStore: Codable, Equatable {
    var settings: AppSettings
    var cycles: [PayCycle]

    static let empty = AppStore(settings: .default, cycles: [])

    var activeCycle: PayCycle? {
        cycles.first(where: \.isActive) ?? cycles.first
    }

    mutating func upsert(_ cycle: PayCycle) {
        if let index = cycles.firstIndex(where: { $0.id == cycle.id }) {
            cycles[index] = cycle
        } else {
            if !settings.isPremium {
                cycles = cycles.map { var c = $0; c.isActive = false; return c }
            }
            cycles.append(cycle)
        }
    }

    mutating func setActive(id: UUID) {
        cycles = cycles.map { cycle in
            var copy = cycle
            copy.isActive = cycle.id == id
            return copy
        }
    }
}
