import CryptoKit
import Foundation

enum ContentValidationError: LocalizedError, Equatable {
    case invalid(String)

    var errorDescription: String? {
        switch self {
        case let .invalid(message): message
        }
    }
}

struct ContentValidator {
    func validate(_ content: AppContent) throws {
        try validateManifest(content.manifest, resources: content.resourceData)

        guard content.phrases.count == content.manifest.content.phraseCount else {
            throw invalid("語料數與 manifest 不符")
        }
        guard content.levels.count == content.manifest.content.levelCount else {
            throw invalid("關卡數與 manifest 不符")
        }
        guard content.levels.flatMap(\.targets).count == content.manifest.content.targetCount else {
            throw invalid("關卡目標數與 manifest 不符")
        }

        let phrasesByID = try validatePhrases(content.phrases)
        try validateLevels(content.levels, phrasesByID: phrasesByID)
    }

    func validateManifest(_ manifest: ContentManifest, resources: [String: Data]) throws {
        guard manifest.schemaVersion == 1 else {
            throw invalid("不支援的內容 manifest 版本：\(manifest.schemaVersion)")
        }
        guard Set(resources.keys) == Set(manifest.files.keys) else {
            throw invalid("內容資源清單與 manifest 不符")
        }

        for (path, entry) in manifest.files {
            guard let data = resources[path] else {
                throw invalid("缺少內容資源：\(path)")
            }
            guard data.count == entry.bytes else {
                throw invalid("內容資源大小不符：\(path)")
            }
            let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
            guard digest == entry.sha256 else {
                throw invalid("內容資源雜湊不符：\(path)")
            }
        }
    }

    private func validatePhrases(_ phrases: [Phrase]) throws -> [String: Phrase] {
        var ids = Set<String>()
        var texts = Set<String>()

        for phrase in phrases {
            guard phrase.id.range(of: #"^p\d{4}$"#, options: .regularExpression) != nil else {
                throw invalid("語料 ID 格式錯誤：\(phrase.id)")
            }
            guard ids.insert(phrase.id).inserted else {
                throw invalid("語料 ID 重複：\(phrase.id)")
            }
            guard texts.insert(phrase.text).inserted else {
                throw invalid("語料文字重複：\(phrase.text)")
            }
            guard !phrase.text.isEmpty, !phrase.meaning.isEmpty, !phrase.insight.isEmpty else {
                throw invalid("語料必填文字不得為空：\(phrase.id)")
            }
            guard phrase.clues.count >= 3,
                  phrase.clues.contains(where: { $0.style == .definition }) else {
                throw invalid("語料線索不足或缺少釋義線索：\(phrase.id)")
            }
            guard phrase.clues.allSatisfy({ !$0.text.isEmpty }) else {
                throw invalid("語料含空白線索：\(phrase.id)")
            }
            if phrase.type.isLiterary {
                guard phrase.author?.isEmpty == false, phrase.dynasty?.isEmpty == false else {
                    throw invalid("文學語料缺作者或朝代：\(phrase.id)")
                }
            } else if phrase.author != nil || phrase.dynasty != nil {
                throw invalid("成語、諺語或俗語不得含作者／朝代：\(phrase.id)")
            }
        }

        return Dictionary(uniqueKeysWithValues: phrases.map { ($0.id, $0) })
    }

    private func validateLevels(_ levels: [Level], phrasesByID: [String: Phrase]) throws {
        guard Set(levels.map(\.id)).count == levels.count else {
            throw invalid("關卡 ID 重複")
        }

        for level in levels {
            try validate(level, phrasesByID: phrasesByID)
        }
    }

    private func validate(_ level: Level, phrasesByID: [String: Phrase]) throws {
        guard level.size > 0,
              level.grid.count == level.size,
              level.grid.allSatisfy({ $0.count == level.size }) else {
            throw invalid("第 \(level.id) 關 grid 尺寸錯誤")
        }
        guard !level.targets.isEmpty else {
            throw invalid("第 \(level.id) 關沒有目標")
        }
        guard Set(level.targets.map(\.phraseID)).count == level.targets.count else {
            throw invalid("第 \(level.id) 關含重複目標")
        }

        var owners: [GridCoordinate: [(target: Int, direction: GridDirection, character: Character)]] = [:]
        for (index, target) in level.targets.enumerated() {
            guard let phrase = phrasesByID[target.phraseID] else {
                throw invalid("第 \(level.id) 關引用不存在語料：\(target.phraseID)")
            }
            guard phrase.clues.indices.contains(target.clueIndex) else {
                throw invalid("第 \(level.id) 關 clueIndex 越界：\(target.phraseID)")
            }
            guard level.directions.contains(target.direction) else {
                throw invalid("第 \(level.id) 關使用未允許方向")
            }

            let characters = Array(phrase.text)
            let cells = path(from: target.start, direction: target.direction, length: characters.count)
            guard cells.allSatisfy({ contains($0, size: level.size) }) else {
                throw invalid("第 \(level.id) 關路徑越界：\(target.phraseID)")
            }
            let read = cells.compactMap { level.grid[$0.row][$0.column] }.joined()
            guard read == phrase.text else {
                throw invalid("第 \(level.id) 關路徑讀值不符：\(target.phraseID)")
            }

            for (offset, coordinate) in cells.enumerated() {
                owners[coordinate, default: []].append((index, target.direction, characters[offset]))
            }
        }

        switch level.layout {
        case .full:
            guard level.revealed == nil else {
                throw invalid("第 \(level.id) 關 full 盤面不得有 revealed")
            }
            guard level.grid.joined().allSatisfy({ cell in
                guard let cell else { return false }
                return cell.count == 1
            }) else {
                throw invalid("第 \(level.id) 關 full 盤面含空格或非單字格")
            }
        case .cross:
            try validateCross(level, owners: owners)
        }
    }

    private func validateCross(
        _ level: Level,
        owners: [GridCoordinate: [(target: Int, direction: GridDirection, character: Character)]]
    ) throws {
        for row in level.grid.indices {
            for column in level.grid[row].indices where level.grid[row][column] != nil {
                let coordinate = GridCoordinate(row: row, column: column)
                guard owners[coordinate] != nil else {
                    throw invalid("第 \(level.id) 關 cross 盤面含非路徑字格")
                }
            }
        }

        var crossingCoordinates = Set<GridCoordinate>()
        for (coordinate, entries) in owners where entries.count >= 2 {
            guard Set(entries.map(\.character)).count == 1 else {
                throw invalid("第 \(level.id) 關交叉格字元不一致")
            }
            guard Set(entries.map(\.direction)).count >= 2 else {
                throw invalid("第 \(level.id) 關同向詞錯誤共用字格")
            }
            crossingCoordinates.insert(coordinate)
        }
        guard let revealed = level.revealed,
              Set(revealed).count == revealed.count,
              Set(revealed) == crossingCoordinates else {
            throw invalid("第 \(level.id) 關 revealed 與交叉格不一致")
        }

        var adjacency = Array(repeating: Set<Int>(), count: level.targets.count)
        for entries in owners.values where entries.count >= 2 {
            for first in entries {
                for second in entries where first.target != second.target {
                    adjacency[first.target].insert(second.target)
                }
            }
        }
        guard adjacency.allSatisfy({ !$0.isEmpty }) else {
            throw invalid("第 \(level.id) 關含未交叉詞")
        }

        var visited: Set<Int> = [0]
        var stack = [0]
        while let current = stack.popLast() {
            for neighbor in adjacency[current] where visited.insert(neighbor).inserted {
                stack.append(neighbor)
            }
        }
        guard visited.count == level.targets.count else {
            throw invalid("第 \(level.id) 關詞網不連通")
        }
    }

    private func path(
        from start: GridCoordinate,
        direction: GridDirection,
        length: Int
    ) -> [GridCoordinate] {
        (0..<length).map { offset in
            switch direction {
            case .east:
                GridCoordinate(row: start.row, column: start.column + offset)
            case .south:
                GridCoordinate(row: start.row + offset, column: start.column)
            }
        }
    }

    private func contains(_ coordinate: GridCoordinate, size: Int) -> Bool {
        (0..<size).contains(coordinate.row) && (0..<size).contains(coordinate.column)
    }

    private func invalid(_ message: String) -> ContentValidationError {
        .invalid(message)
    }
}
