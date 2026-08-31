import SwiftUI

struct CrossBoardView: View {
    let level: Level
    let targets: [(target: LevelTarget, phrase: Phrase)]
    let foundPhraseIDs: Set<String>
    let hintCoordinates: Set<GridCoordinate>
    @Binding var selectedPhraseID: String?

    var body: some View {
        VStack(spacing: 12) {
            GeometryReader { proxy in
                let side = min(proxy.size.width, proxy.size.height)
                let cellSize = side / CGFloat(level.size)
                VStack(spacing: 0) {
                    ForEach(level.grid.indices, id: \.self) { row in
                        HStack(spacing: 0) {
                            ForEach(level.grid[row].indices, id: \.self) { column in
                                let coordinate = GridCoordinate(row: row, column: column)
                                crossCell(coordinate, cellSize: cellSize)
                            }
                        }
                    }
                }
            }
            .aspectRatio(1, contentMode: .fit)
            .accessibilityIdentifier("cross-board")
        }
    }

    @ViewBuilder
    private func crossCell(_ coordinate: GridCoordinate, cellSize: CGFloat) -> some View {
        let value = level.grid[coordinate.row][coordinate.column]
        if value == nil {
            Color.clear.frame(width: cellSize, height: cellSize)
        } else {
            let revealed = Set(level.revealed ?? []).contains(coordinate)
            let owners = targets.filter { item in
                NativeParityRules.targetPath(
                    start: item.target.start,
                    direction: item.target.direction,
                    length: item.phrase.text.count,
                    size: level.size
                )?.contains(coordinate) == true
            }
            let visible = revealed || hintCoordinates.contains(coordinate)
                || owners.contains { foundPhraseIDs.contains($0.phrase.id) }
            Button {
                selectedPhraseID = owners.first { !foundPhraseIDs.contains($0.phrase.id) }?.phrase.id
            } label: {
                Text(visible ? value ?? "" : "")
                    .font(.system(size: max(14, cellSize * 0.45), weight: .bold))
                    .foregroundStyle(AppTheme.primaryText)
                    .frame(width: cellSize, height: cellSize)
                    .background(Color.white.opacity(visible ? 0.18 : 0.08))
                    .overlay(Rectangle().stroke(AppTheme.accent.opacity(0.6), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("第 \(coordinate.row + 1) 列第 \(coordinate.column + 1) 欄，\(visible ? value ?? "待填" : "待填")")
        }
    }
}
