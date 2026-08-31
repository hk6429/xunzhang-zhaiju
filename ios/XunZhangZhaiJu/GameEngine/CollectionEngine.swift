import Foundation

struct CollectionEngine: Equatable {
    private var orderedPhraseIDs: [String]
    private var knownPhraseIDs: Set<String>

    init(initialPhraseIDs: [String] = []) {
        var seen = Set<String>()
        orderedPhraseIDs = initialPhraseIDs.filter { !$0.isEmpty && seen.insert($0).inserted }
        knownPhraseIDs = seen
    }

    var phraseIDs: [String] { orderedPhraseIDs }

    func contains(_ phraseID: String) -> Bool {
        knownPhraseIDs.contains(phraseID)
    }

    @discardableResult
    mutating func collect(_ phraseID: String, revealed: Bool) -> Bool {
        guard !revealed, !phraseID.isEmpty, knownPhraseIDs.insert(phraseID).inserted else {
            return false
        }
        orderedPhraseIDs.append(phraseID)
        return true
    }
}
