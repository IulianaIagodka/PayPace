import Foundation

enum DecimalParsing {
    static func parse(_ text: String) -> Decimal? {
        let trimmed = text
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: ",", with: ".")
            .replacingOccurrences(of: " ", with: "")
        guard !trimmed.isEmpty else { return nil }
        return Decimal(string: trimmed)
    }

    static func parseOrZero(_ text: String) -> Decimal {
        parse(text) ?? 0
    }
}
