import Foundation

struct GridCoordinate: Codable, Hashable, Comparable {
    var row: Int
    var column: Int

    init(row: Int, column: Int) {
        self.row = row
        self.column = column
    }

    init(from decoder: Decoder) throws {
        var container = try decoder.unkeyedContainer()
        row = try container.decode(Int.self)
        column = try container.decode(Int.self)
        guard container.isAtEnd else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "座標必須恰有 row、column 兩個整數"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.unkeyedContainer()
        try container.encode(row)
        try container.encode(column)
    }

    static func < (lhs: GridCoordinate, rhs: GridCoordinate) -> Bool {
        lhs.row == rhs.row ? lhs.column < rhs.column : lhs.row < rhs.row
    }
}
