import Foundation

struct AppContent {
    var manifest: ContentManifest
    var phrases: [Phrase]
    var levels: [Level]
    var events: EventDocument
    var story: StoryLore
    var resourceData: [String: Data]
}

enum ContentLoadingError: LocalizedError {
    case missingResource(String)

    var errorDescription: String? {
        switch self {
        case let .missingResource(name):
            "App 缺少內容資源：\(name)"
        }
    }
}

struct ContentLoader {
    private let bundle: Bundle
    private let decoder: JSONDecoder

    init(bundle: Bundle = .main, decoder: JSONDecoder = JSONDecoder()) {
        self.bundle = bundle
        self.decoder = decoder
    }

    func load() throws -> AppContent {
        let manifestData = try data(named: "app-content-manifest")
        let manifest = try decoder.decode(ContentManifest.self, from: manifestData)
        let resources = try Dictionary(uniqueKeysWithValues: manifest.files.keys.map { path in
            let filename = URL(fileURLWithPath: path).deletingPathExtension().lastPathComponent
            return (path, try data(named: filename))
        })

        try ContentValidator().validateManifest(manifest, resources: resources)

        let phrases = try decoder.decode(
            [Phrase].self,
            from: try requiredData("data/phrases.json", in: resources)
        )
        let levelDocument = try decoder.decode(
            LevelDocument.self,
            from: try requiredData("data/levels.json", in: resources)
        )
        let events = try decoder.decode(
            EventDocument.self,
            from: try requiredData("data/events.json", in: resources)
        )
        let story = try decoder.decode(
            StoryLore.self,
            from: try requiredData("data/story-lore-v2.json", in: resources)
        )
        let content = AppContent(
            manifest: manifest,
            phrases: phrases,
            levels: levelDocument.levels,
            events: events,
            story: story,
            resourceData: resources
        )
        try ContentValidator().validate(content)
        return content
    }

    private func data(named name: String) throws -> Data {
        guard let url = bundle.url(forResource: name, withExtension: "json") else {
            throw ContentLoadingError.missingResource("\(name).json")
        }
        return try Data(contentsOf: url)
    }

    private func requiredData(_ key: String, in resources: [String: Data]) throws -> Data {
        guard let data = resources[key] else {
            throw ContentLoadingError.missingResource(key)
        }
        return data
    }
}
