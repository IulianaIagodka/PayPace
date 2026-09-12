import Foundation

struct CurrencyFormatter {
    let code: String

    private var formatter: NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = code
        formatter.maximumFractionDigits = 0
        formatter.minimumFractionDigits = 0
        if code == "PLN" {
            formatter.currencySymbol = "zł"
            formatter.locale = Locale(identifier: "pl_PL")
        }
        return formatter
    }

    func string(from value: Decimal) -> String {
        let number = NSDecimalNumber(decimal: value)
        return formatter.string(from: number) ?? "\(value) \(code)"
    }

    func string(from value: Double) -> String {
        string(from: Decimal(value))
    }

    var symbol: String {
        switch code {
        case "PLN": return "zł"
        case "USD": return "$"
        case "EUR": return "€"
        case "GBP": return "£"
        default: return code
        }
    }
}

enum DateFormatting {
    static func medium(_ date: Date) -> String {
        date.formatted(.dateTime.month(.abbreviated).day())
    }

    static func long(_ date: Date) -> String {
        date.formatted(.dateTime.month(.wide).day().year())
    }

    static func relativeDay(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) { return "Today" }
        if calendar.isDateInTomorrow(date) { return "Tomorrow" }
        return medium(date)
    }
}

extension Decimal {
    var doubleValue: Double {
        NSDecimalNumber(decimal: self).doubleValue
    }

    var plainString: String {
        var value = self
        var rounded = Decimal()
        NSDecimalRound(&rounded, &value, 2, .plain)
        let number = NSDecimalNumber(decimal: rounded)
        if number.doubleValue == floor(number.doubleValue) {
            return String(format: "%.0f", number.doubleValue)
        }
        return String(format: "%.2f", number.doubleValue)
    }
}
