import Foundation

enum PaySchedule: String, Codable, CaseIterable, Identifiable {
    case monthly
    case twiceMonthly
    case everyTwoWeeks
    case weekly
    case custom

    var id: String { rawValue }

    var title: String {
        switch self {
        case .monthly: return "Monthly"
        case .twiceMonthly: return "Twice monthly"
        case .everyTwoWeeks: return "Every 2 weeks"
        case .weekly: return "Weekly"
        case .custom: return "Custom / irregular"
        }
    }

    var subtitle: String {
        switch self {
        case .monthly: return "Once a month"
        case .twiceMonthly: return "Two paydays each month"
        case .everyTwoWeeks: return "Every 14 days"
        case .weekly: return "Every 7 days"
        case .custom: return "You set each payday"
        }
    }

    func nextPayday(after date: Date, calendar: Calendar = .current) -> Date {
        let start = calendar.startOfDay(for: date)
        switch self {
        case .weekly:
            return calendar.date(byAdding: .day, value: 7, to: start) ?? start
        case .everyTwoWeeks:
            return calendar.date(byAdding: .day, value: 14, to: start) ?? start
        case .twiceMonthly:
            let day = calendar.component(.day, from: start)
            if day < 15 {
                var components = calendar.dateComponents([.year, .month], from: start)
                components.day = 15
                return calendar.date(from: components) ?? start
            } else {
                guard let nextMonth = calendar.date(byAdding: .month, value: 1, to: start) else { return start }
                var components = calendar.dateComponents([.year, .month], from: nextMonth)
                components.day = 1
                return calendar.date(from: components) ?? start
            }
        case .monthly:
            return calendar.date(byAdding: .month, value: 1, to: start) ?? start
        case .custom:
            return calendar.date(byAdding: .day, value: 30, to: start) ?? start
        }
    }
}
