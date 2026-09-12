import Foundation

struct DailyExpense: Identifiable, Codable, Equatable, Hashable {
    var id: UUID
    var name: String
    var amount: Decimal
    var date: Date
    var category: ExpenseCategory?
    var note: String?

    init(
        id: UUID = UUID(),
        name: String,
        amount: Decimal,
        date: Date = .now,
        category: ExpenseCategory? = nil,
        note: String? = nil
    ) {
        self.id = id
        self.name = name
        self.amount = amount
        self.date = date
        self.category = category
        self.note = note
    }
}
