import Foundation

enum PhraseType: String, Codable, CaseIterable, Hashable {
    case idiom = "成語"
    case proverb = "諺語"
    case saying = "俗語"
    case hanFu = "漢賦"
    case yuefuPoetry = "樂府詩"
    case nineteenOldPoems = "古詩十九首"
    case tangPoetry = "唐詩"
    case songLyric = "宋詞"
    case yuanQu = "元曲"
    case classicalProse = "古文名句"
    case chapterNovel = "章回小說"
    case newYuefuPoetry = "新樂府詩"
    case songStyle = "歌行"
    case lyricAndQu = "詞曲"

    var isLiterary: Bool {
        ![.idiom, .proverb, .saying].contains(self)
    }
}

enum PhraseDifficulty: String, Codable, CaseIterable, Hashable {
    case common = "常用"
    case advanced = "進階"
}

enum ClueStyle: String, Codable, CaseIterable, Hashable {
    case definition = "釋義"
    case allusion = "典故"
    case situation = "情境"
    case rephrase = "換句話說"
    case riddle = "急轉彎"
}

struct PhraseClue: Codable, Hashable {
    var style: ClueStyle
    var text: String
}

struct Phrase: Codable, Identifiable, Hashable {
    var id: String
    var text: String
    var type: PhraseType
    var level: PhraseDifficulty
    var meaning: String
    var insight: String
    var textbook: Bool?
    var clues: [PhraseClue]
    var author: String?
    var dynasty: String?
    var variantOf: String?
}
