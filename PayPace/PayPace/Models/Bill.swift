import Foundation

struct Bill: Identifiable, Codable, Equatable, Hashable {
    var id: UUID
    var name: String
    var amount: Decimal
    var dueDate: Date
    var category: ExpenseCategory?
    var isRecurring: Bool
    var isPaid: Bool

    init(
        id: UUID = UUID(),
        name: String,
        amount: Decimal,
        dueDate: Date,
        category: ExpenseCategory? = nil,
        isRecurring: Bool = false,
        isPaid: Bool = false
    ) {
        self.id = id
        self.name = name
        self.amount = amount
        self.dueDate = dueDate
        self.category = category
        self.isRecurring = isRecurring
        self.isPaid = isPaid
    }

    var isDueBeforePayday: Bool { !isPaid }
}
