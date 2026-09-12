import Foundation
import UserNotifications

@MainActor
final class NotificationService {
    static let shared = NotificationService()

    func requestAuthorizationIfNeeded() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        case .notDetermined:
            do {
                return try await center.requestAuthorization(options: [.alert, .sound, .badge])
            } catch {
                return false
            }
        default:
            return false
        }
    }

    func reschedule(store: AppStore, snapshot: SafeSpendSnapshot) async {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()

        guard store.settings.notificationsEnabled else { return }
        let authorized = await requestAuthorizationIfNeeded()
        guard authorized, let cycle = store.activeCycle else { return }

        let currency = CurrencyFormatter(code: store.settings.currencyCode)

        if store.settings.morningReminderEnabled {
            var components = DateComponents()
            components.hour = store.settings.morningReminderHour
            components.minute = 0

            let content = UNMutableNotificationContent()
            content.title = "Your safe spend today"
            content.body = "You can safely spend \(currency.string(from: snapshot.safeToSpendToday)) today."
            content.sound = .default

            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
            let request = UNNotificationRequest(
                identifier: "paypace.morning",
                content: content,
                trigger: trigger
            )
            try? await center.add(request)
        }

        if store.settings.billRemindersEnabled {
            let calendar = Calendar.current
            for bill in cycle.upcomingBills.prefix(10) {
                guard let reminderDay = calendar.date(byAdding: .day, value: -1, to: bill.dueDate) else { continue }
                var components = calendar.dateComponents([.year, .month, .day], from: reminderDay)
                components.hour = 18
                components.minute = 0

                let content = UNMutableNotificationContent()
                content.title = "Bill coming up"
                content.body = "\(bill.name): \(currency.string(from: bill.amount)) tomorrow."
                content.sound = .default

                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                let request = UNNotificationRequest(
                    identifier: "paypace.bill.\(bill.id.uuidString)",
                    content: content,
                    trigger: trigger
                )
                try? await center.add(request)
            }
        }

        if store.settings.paceWarningsEnabled,
           let shortfall = snapshot.projectedShortfallDays {
            let content = UNMutableNotificationContent()
            content.title = "Pace check"
            content.body = "At your current pace, you may run short \(shortfall) days before payday."
            content.sound = .default

            var tomorrow = Calendar.current.dateComponents(
                [.year, .month, .day],
                from: Date().addingTimeInterval(86_400)
            )
            tomorrow.hour = 9
            tomorrow.minute = 0
            let morningTrigger = UNCalendarNotificationTrigger(dateMatching: tomorrow, repeats: false)
            let morningRequest = UNNotificationRequest(
                identifier: "paypace.pace.\(cycle.id.uuidString)",
                content: content,
                trigger: morningTrigger
            )
            try? await center.add(morningRequest)
        }
    }
}
