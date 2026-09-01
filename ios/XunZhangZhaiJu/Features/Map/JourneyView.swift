import SwiftUI

struct JourneyView: View {
    @EnvironmentObject private var container: AppContainer
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var presentsHiddenEnding = false

    var body: some View {
        Group {
            switch container.startupState {
            case .ready:
                if let content = container.content {
                    ScrollView {
                        VStack(spacing: 28) {
                            mapIntroduction
                            mountainMap(content: content)
                            endingSection(content: content)
                            literaryVolume(content: content)
                        }
                        .padding()
                    }
                    .background(AppTheme.background)
                }
            case let .failed(message):
                VStack(spacing: 14) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundStyle(Color.orange)
                    Text("內容無法載入")
                        .font(.title2.bold())
                    Text(message)
                        .multilineTextAlignment(.center)
                }
                .foregroundStyle(AppTheme.primaryText)
                .padding()
            }
        }
        .navigationTitle("修煉山河")
        .sheet(isPresented: $presentsHiddenEnding) {
            if let story = container.content?.story {
                HiddenEndingQuestionView(story: story)
                    .environmentObject(container)
            }
        }
    }

    private var levelColumns: [GridItem] {
        if dynamicTypeSize.isAccessibilitySize {
            return [GridItem(.flexible())]
        }
        return [GridItem(.adaptive(minimum: 150), spacing: 14)]
    }

    private var mapIntroduction: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("第一卷・封神山河卷")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.accent)
            Text("循五座文字大陣，尋回散落的真言")
                .font(.title2.bold())
                .foregroundStyle(AppTheme.primaryText)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
                .minimumScaleFactor(0.75)
            Label("左右滑動探索；岔路會通往典故與法寶", systemImage: "hand.draw")
                .font(.subheadline)
                .foregroundStyle(AppTheme.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("第一卷，封神山河卷。循五座文字大陣，尋回散落的真言。左右滑動探索，岔路會通往典故與法寶。")
    }

    private func mountainMap(content: AppContent) -> some View {
        MountainJourneyMap(
            levels: content.levels.filter { $0.id <= 50 },
            chapters: content.story.chapters.filter { $0.id <= 5 },
            progress: container.progress,
            destination: { level in
                GameView(
                    level: level,
                    phrases: content.phrases,
                    container: container,
                    chapter: content.story.chapters.first { $0.id == level.chapter },
                    event: level.eventId.flatMap { eventID in
                        content.events.events.first { $0.id == eventID }
                    }
                )
            }
        )
    }

    private func literaryVolume(content: AppContent) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 5) {
                Text("第二卷・文林淬鍊卷")
                    .font(.caption.bold())
                    .foregroundStyle(AppTheme.accent)
                Text("穿行歷代文林，再鍊五十座字陣")
                    .font(.title2.bold())
                    .foregroundStyle(AppTheme.primaryText)
            }

            ForEach(6...10, id: \.self) { chapter in
                VStack(alignment: .leading, spacing: 12) {
                    chapterHeader(chapter, content: content)
                    LazyVGrid(columns: levelColumns, spacing: 14) {
                        ForEach(content.levels.filter { $0.chapter == chapter }) { level in
                            levelLink(level, content: content)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func endingSection(content: AppContent) -> some View {
        let state = WorldProgressEngine().endingState(for: container.progress, story: content.story)
        if state.normalUnlocked {
            VStack(alignment: .leading, spacing: 12) {
                Label(
                    state.hiddenLevelCompleted ? "真結局" : "第一卷結局",
                    systemImage: state.hiddenLevelCompleted ? "sparkles" : "scroll.fill"
                )
                .font(.caption.bold())
                .foregroundStyle(AppTheme.accent)

                Text(state.hiddenLevelCompleted ? content.story.endings.true.title : content.story.endings.normal.title)
                    .font(.title2.bold())
                    .foregroundStyle(AppTheme.primaryText)
                Text(state.hiddenLevelCompleted ? content.story.endings.true.summary : content.story.endings.normal.summary)
                    .foregroundStyle(AppTheme.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)

                if state.hiddenLevelCompleted {
                    Label("天書已珍藏，文字的力量回到每個使用它的人手中。", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(AppTheme.primaryText)
                        .accessibilityIdentifier("true-ending-completed")
                } else if state.hiddenLevelUnlocked {
                    Button {
                        presentsHiddenEnding = true
                    } label: {
                        Label(content.story.hiddenLevel.title, systemImage: "book.pages.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .accessibilityIdentifier("open-hidden-ending")
                    .accessibilityHint("開啟空白天書的最後一問")
                } else {
                    Text("真結局尚待完成")
                        .font(.headline)
                        .foregroundStyle(AppTheme.primaryText)
                    ForEach(Array(state.missingForTrue.enumerated()), id: \.offset) { _, gap in
                        Label(endingGapLabel(gap, story: content.story), systemImage: "circle")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.secondaryText)
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.surface, in: RoundedRectangle(cornerRadius: 20))
            .overlay {
                RoundedRectangle(cornerRadius: 20)
                    .stroke(AppTheme.accent, lineWidth: 2)
            }
        }
    }

    private func endingGapLabel(_ gap: EndingRequirementGap, story: StoryLore) -> String {
        switch gap {
        case let .completedLevels(ids):
            return "完成第 \(ids.map(String.init).joined(separator: "、")) 關"
        case let .bossStars(ids, minimum):
            return "第 \(ids.map(String.init).joined(separator: "、")) 關各取得 \(minimum) 星"
        case let .events(ids):
            return "走完尚缺的 \(ids.count) 段山河奇遇"
        case let .treasures(ids):
            let names = ids.map { id in story.treasures.first { $0.id == id }?.name ?? id }
            return "集齊：\(names.joined(separator: "、"))"
        }
    }

    @ViewBuilder
    private func chapterHeader(_ chapter: Int, content: AppContent) -> some View {
        let story = content.story.chapters.first { $0.id == chapter }
        VStack(alignment: .leading, spacing: 4) {
            Text("文林卷・第 \(chapter) 章")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.accent)
            Text(story?.title ?? "第 \(chapter) 章")
                .font(.title2.bold())
                .foregroundStyle(AppTheme.primaryText)
            if let region = story?.mapRegion {
                Text(region)
                    .foregroundStyle(AppTheme.secondaryText)
            }
        }
    }

    @ViewBuilder
    private func levelLink(_ level: Level, content: AppContent) -> some View {
        let unlocked = level.requirements.completedAll.allSatisfy {
            (container.progress.levels[String($0)]?.stars ?? 0) > 0
        }
        let stars = container.progress.levels[String(level.id)]?.stars ?? 0
        if unlocked {
            NavigationLink {
                GameView(
                    level: level,
                    phrases: content.phrases,
                    container: container,
                    chapter: content.story.chapters.first { $0.id == level.chapter },
                    event: level.eventId.flatMap { eventID in
                        content.events.events.first { $0.id == eventID }
                    }
                )
            } label: {
                levelCard(level, stars: stars, unlocked: true)
            }
            .accessibilityIdentifier("level-\(level.id)")
            .accessibilityLabel("第 \(level.id) 關，\(level.chapterTitle)，\(stars) 星")
        } else {
            levelCard(level, stars: stars, unlocked: false)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("第 \(level.id) 關，\(level.chapterTitle)，尚未解鎖")
        }
    }

    private func levelCard(_ level: Level, stars: Int, unlocked: Bool) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("第 \(level.id) 關")
                    .font(.headline)
                Spacer()
                Image(systemName: unlocked ? "seal.fill" : "lock.fill")
            }
            Text(level.chapterTitle)
                .font(.title3.bold())
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
            Text(level.layout == .full ? "尋句字陣" : "交叉填字")
                .font(.subheadline)
            Text(stars > 0 ? String(repeating: "★", count: stars) + String(repeating: "☆", count: 3 - stars) : "尚未破陣")
                .foregroundStyle(AppTheme.accent)
        }
        .foregroundStyle(AppTheme.primaryText)
        .frame(maxWidth: .infinity, minHeight: 112, alignment: .leading)
        .padding()
        .background(AppTheme.surface, in: RoundedRectangle(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .stroke(unlocked ? AppTheme.accent : AppTheme.secondaryText)
        }
    }
}

private struct HiddenEndingQuestionView: View {
    @EnvironmentObject private var container: AppContainer
    @Environment(\.dismiss) private var dismiss
    let story: StoryLore
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Label("隱藏一頁", systemImage: "sparkles.rectangle.stack")
                        .font(.headline)
                        .foregroundStyle(AppTheme.accent)
                    Text(story.hiddenLevel.title)
                        .font(.largeTitle.bold())
                        .foregroundStyle(AppTheme.primaryText)
                    Text("五段故事與五件法寶在空白天書上化為最後一問：文字的力量，來自唯一的標準答案，還是來自人們願意理解並使用它？")
                        .font(.title3)
                        .foregroundStyle(AppTheme.primaryText)
                        .fixedSize(horizontal: false, vertical: true)

                    Button("來自人們理解與使用") {
                        do {
                            try container.recordHiddenEnding(.people)
                            dismiss()
                        } catch {
                            errorMessage = error.localizedDescription
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .accessibilityIdentifier("choose-people-ending")

                    Button("只來自唯一答案") { dismiss() }
                        .buttonStyle(.bordered)
                        .accessibilityIdentifier("choose-single-ending")

                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .foregroundStyle(Color.orange)
                    }
                }
                .padding()
            }
            .background(AppTheme.background)
            .navigationTitle("天書失落之頁")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("稍後再答") { dismiss() }
                }
            }
        }
        .accessibilityIdentifier("hidden-ending-question")
    }
}

private struct MountainJourneyMap<Destination: View>: View {
    let levels: [Level]
    let chapters: [StoryLore.Chapter]
    let progress: LocalAppProgress
    @ViewBuilder let destination: (Level) -> Destination

    // mapPosition 百分比沿用網頁版 2600×900 座標系；維持相同比例才會和底圖地標對齊。
    private let mapSize = CGSize(width: 1_600, height: 554)

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ScrollView(.horizontal) {
                ZStack {
                    Image("JourneyMap")
                        .resizable()
                        .scaledToFill()
                        .frame(width: mapSize.width, height: mapSize.height)
                        .clipped()
                        .accessibilityHidden(true)

                    routeLines

                    ForEach(chapters) { chapter in
                        chapterLandmark(chapter)
                    }

                    ForEach(levels) { level in
                        levelNode(level)
                    }
                }
                .frame(width: mapSize.width, height: mapSize.height)
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .overlay {
                    RoundedRectangle(cornerRadius: 22)
                        .stroke(AppTheme.accent.opacity(0.65), lineWidth: 2)
                }
                .padding(.vertical, 2)
            }
            .scrollIndicators(.visible)
            .accessibilityIdentifier("mountain-journey-map")
            .accessibilityLabel("封神山河闖關圖，可左右滑動探索五大陣法")

            HStack(spacing: 16) {
                mapLegend("主線", color: AppTheme.accent, icon: "seal")
                mapLegend("典故", color: Color(red: 0.33, green: 0.66, blue: 0.58), icon: "book.closed")
                mapLegend("法寶", color: Color.orange, icon: "shippingbox")
                mapLegend("章末", color: Color.red, icon: "crown")
            }
            .font(.caption.bold())
            .foregroundStyle(AppTheme.secondaryText)
            .accessibilityElement(children: .combine)
        }
    }

    private var routeLines: some View {
        Canvas { context, _ in
            let levelsByID = Dictionary(uniqueKeysWithValues: levels.map { ($0.id, $0) })
            for level in levels {
                guard let from = point(for: level) else { continue }
                for nextID in level.nextIds where nextID <= 50 {
                    guard let next = levelsByID[nextID], let to = point(for: next) else { continue }
                    var path = Path()
                    path.move(to: from)
                    let middleX = (from.x + to.x) / 2
                    path.addCurve(
                        to: to,
                        control1: CGPoint(x: middleX, y: from.y),
                        control2: CGPoint(x: middleX, y: to.y)
                    )
                    context.stroke(
                        path,
                        with: .color(routeColor(level.routeType).opacity(0.85)),
                        style: StrokeStyle(
                            lineWidth: level.routeType == .main ? 2.5 : 2,
                            lineCap: .round,
                            dash: routeDash(level.routeType)
                        )
                    )
                }
            }
        }
        .frame(width: mapSize.width, height: mapSize.height)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    @ViewBuilder
    private func levelNode(_ level: Level) -> some View {
        if let position = point(for: level) {
            let stars = progress.levels[String(level.id)]?.stars ?? 0
            let unlocked = isUnlocked(level)
            Group {
                if unlocked {
                    NavigationLink {
                        destination(level)
                    } label: {
                        nodeLabel(level, stars: stars, unlocked: true)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("level-\(level.id)")
                    .accessibilityLabel(nodeAccessibilityLabel(level, stars: stars, unlocked: true))
                } else {
                    nodeLabel(level, stars: stars, unlocked: false)
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel(nodeAccessibilityLabel(level, stars: stars, unlocked: false))
                }
            }
            .position(position)
        }
    }

    private func nodeLabel(_ level: Level, stars: Int, unlocked: Bool) -> some View {
        let diameter: CGFloat = level.boss == nil ? 48 : 60
        return ZStack(alignment: .topTrailing) {
            VStack(spacing: 2) {
                ZStack {
                    Circle()
                        .fill(nodeFill(stars: stars, unlocked: unlocked))
                    Circle()
                        .stroke(routeColor(level.routeType), lineWidth: level.boss == nil ? 3 : 5)
                    if unlocked {
                        Text("\(level.id)")
                            .font(.system(size: level.boss == nil ? 16 : 18, weight: .black, design: .rounded))
                            .foregroundStyle(Color.black)
                    } else {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Color.black.opacity(0.7))
                    }
                }
                .frame(width: diameter, height: diameter)
                .shadow(color: Color.black.opacity(0.5), radius: 4, y: 3)

                if unlocked {
                    Text(stars > 0 ? String(repeating: "★", count: stars) : routeSymbol(level))
                        .font(.system(size: 12, weight: .black))
                        .foregroundStyle(stars > 0 ? AppTheme.accent : Color.white)
                        .shadow(color: Color.black, radius: 2)
                }
            }

            if level.eventId != nil && unlocked {
                Text("!")
                    .font(.caption2.weight(.black))
                    .foregroundStyle(Color.white)
                    .frame(width: 20, height: 20)
                    .background(Color.red, in: Circle())
                    .offset(x: 5, y: -5)
            }
        }
        .frame(minWidth: 60, minHeight: 70)
        .opacity(unlocked ? 1 : 0.75)
    }

    private func chapterLandmark(_ chapter: StoryLore.Chapter) -> some View {
        VStack(spacing: 2) {
            Text("第 \(chapter.id) 章")
                .font(.caption2.bold())
                .foregroundStyle(AppTheme.accent)
            Text(chapter.mapRegion)
                .font(.caption.bold())
                .foregroundStyle(Color.white)
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(Color.black.opacity(0.72), in: RoundedRectangle(cornerRadius: 10))
        .overlay {
            RoundedRectangle(cornerRadius: 10)
                .stroke(AppTheme.accent.opacity(0.8))
        }
        .position(x: mapSize.width * chapter.position.x / 100, y: 54)
        .accessibilityElement(children: .combine)
    }

    private func mapLegend(_ title: String, color: Color, icon: String) -> some View {
        Label(title, systemImage: icon)
            .symbolRenderingMode(.monochrome)
            .foregroundStyle(color)
    }

    private func point(for level: Level) -> CGPoint? {
        guard let position = level.mapPosition else { return nil }
        return CGPoint(
            x: mapSize.width * position.x / 100,
            y: mapSize.height * position.y / 100
        )
    }

    private func isUnlocked(_ level: Level) -> Bool {
        level.requirements.completedAll.allSatisfy {
            (progress.levels[String($0)]?.stars ?? 0) > 0
        }
    }

    private func routeColor(_ route: RouteType?) -> Color {
        switch route ?? .main {
        case .main: AppTheme.accent
        case .lore: Color(red: 0.33, green: 0.66, blue: 0.58)
        case .treasure: Color.orange
        }
    }

    private func routeDash(_ route: RouteType?) -> [CGFloat] {
        switch route ?? .main {
        case .main: []
        case .lore: [10, 7]
        case .treasure: [3, 7]
        }
    }

    private func routeSymbol(_ level: Level) -> String {
        if level.boss != nil { return "王" }
        switch level.routeType ?? .main {
        case .main: return "主"
        case .lore: return "典"
        case .treasure: return "寶"
        }
    }

    private func nodeFill(stars: Int, unlocked: Bool) -> Color {
        if !unlocked { return Color(white: 0.7) }
        return stars > 0 ? Color(red: 1, green: 0.86, blue: 0.43) : Color(red: 1, green: 0.97, blue: 0.83)
    }

    private func nodeAccessibilityLabel(_ level: Level, stars: Int, unlocked: Bool) -> String {
        let route: String
        if level.boss != nil {
            route = "章末大陣"
        } else {
            switch level.routeType ?? .main {
            case .main: route = "主線"
            case .lore: route = "典故支線"
            case .treasure: route = "法寶支線"
            }
        }
        return unlocked
            ? "第 \(level.id) 關，\(route)，\(level.chapterTitle)，\(stars) 星"
            : "第 \(level.id) 關，\(route)，尚未解鎖"
    }
}
