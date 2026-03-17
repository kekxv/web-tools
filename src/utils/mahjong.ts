/**
 * 麻将游戏核心逻辑 - 广东麻将规则
 */

// 牌的类型
export const TILE_TYPE = {
  MANZU: 'manzu',    // 万子
  PINZU: 'pinzu',    // 筒子
  SOUZU: 'souzu',    // 索子/条子
  JIHAI: 'jihai'     // 字牌
} as const

export type TileType = typeof TILE_TYPE[keyof typeof TILE_TYPE]

// 风牌
export const WINDS = {
  EAST: 'east',      // 东
  SOUTH: 'south',    // 南
  WEST: 'west',      // 西
  NORTH: 'north'     // 北
} as const

export type Wind = typeof WINDS[keyof typeof WINDS]

// 三元牌
export const DRAGONS = {
  WHITE: 'white',    // 白/中
  GREEN: 'green',    // 发
  RED: 'red'         // 中/红中
} as const

export type Dragon = typeof DRAGONS[keyof typeof DRAGONS]

// 所有牌值
export const TILE_VALUE = {
  // 万子 1-9
  MAN1: 1, MAN2: 2, MAN3: 3, MAN4: 4, MAN5: 5, MAN6: 6, MAN7: 7, MAN8: 8, MAN9: 9,
  // 筒子 11-19
  PIN1: 11, PIN2: 12, PIN3: 13, PIN4: 14, PIN5: 15, PIN6: 16, PIN7: 17, PIN8: 18, PIN9: 19,
  // 索子 21-29
  SOU1: 21, SOU2: 22, SOU3: 23, SOU4: 24, SOU5: 25, SOU6: 26, SOU7: 27, SOU8: 28, SOU9: 29,
  // 风牌 31-34
  EAST: 31, SOUTH: 32, WEST: 33, NORTH: 34,
  // 三元牌 35-37
  WHITE: 35, GREEN: 36, RED: 37
} as const

export type TileValue = typeof TILE_VALUE[keyof typeof TILE_VALUE]

// 牌面显示
export const TILE_DISPLAY: Record<string, string> = {
  MAN1: '1', MAN2: '2', MAN3: '3', MAN4: '4', MAN5: '5', MAN6: '6', MAN7: '7', MAN8: '8', MAN9: '9',
  PIN1: '1', PIN2: '2', PIN3: '3', PIN4: '4', PIN5: '5', PIN6: '6', PIN7: '7', PIN8: '8', PIN9: '9',
  SOU1: '1', SOU2: '2', SOU3: '3', SOU4: '4', SOU5: '5', SOU6: '6', SOU7: '7', SOU8: '8', SOU9: '9',
  EAST: '东', SOUTH: '南', WEST: '西', NORTH: '北',
  WHITE: '白', GREEN: '发', RED: '中'
}

// 牌的颜色分类（用于 UI 显示）
export const TILE_COLOR: Record<string, string> = {
  MAN1: 'man', MAN2: 'man', MAN3: 'man', MAN4: 'man', MAN5: 'man', MAN6: 'man', MAN7: 'man', MAN8: 'man', MAN9: 'man',
  PIN1: 'pin', PIN2: 'pin', PIN3: 'pin', PIN4: 'pin', PIN5: 'pin', PIN6: 'pin', PIN7: 'pin', PIN8: 'pin', PIN9: 'pin',
  SOU1: 'sou', SOU2: 'sou', SOU3: 'sou', SOU4: 'sou', SOU5: 'sou', SOU6: 'sou', SOU7: 'sou', SOU8: 'sou', SOU9: 'sou',
  EAST: 'ji', SOUTH: 'ji', WEST: 'ji', NORTH: 'ji', WHITE: 'ji', GREEN: 'ji', RED: 'ji'
}

// 广东麻将番种
export const FAN_TYPES = {
  // 一番
  JIPINGHU: '鸡平胡',         // 基本和牌
  MENQIANQING: '门前清',       // 没有吃碰明杠
  ZIMO: '自摸',               // 自摸和牌
  QINGYISE: '清一色',         // 同一花色（6 番）
  HUNYISE: '混一色',          // 同一花色 + 字牌（3 番）
  PENGPENGHU: '碰碰胡',        // 全是刻子/杠子（3 番）
  HUNQUANDAI: '混全带',        // 每组都有幺九牌（2 番）
  WUMENQI: '无门关',           // 没有顺子（2 番）

  // 二番
  YIBAN_GAO: '一般高',         // 两个相同顺子
  LIANLIU: '连六',             // 连续两个顺子
  XiangGen: '相根',            // 同花色的两副顺子首尾相连

  // 三番
  DUI_DUI_HU: '对对胡',        // 全是刻子
  SAN_TONG_KE: '三同刻',       // 三个数值相同的刻子
  SAN_LIAN_KE: '三连刻',       // 三个连续的刻子

  // 六番
  QING_LAO_TIAN: '清老天',     // 清一色 + 自摸

  // 十三番（满番）
  SHISAN_YAO: '十三幺',        // 国士无双
  DA_SAN_YUAN: '大三元',       // 中发白三个刻子
  XIAO_SAN_YUAN: '小三元',     // 中发白两个刻子一个对子
  DA_SI_XI: '大四喜',         // 东南西北四个刻子
  XIAO_SI_XI: '小四喜',        // 东南西北三个刻子
  JIU_LIAN: '九莲宝灯',       // 清一色 1112345678999+任意
  GANG_SHANG_KAI_HUA: '杠上开花', // 杠后自摸
  HAI_DI_LAO_YUE: '海底捞月',   // 最后一张牌自摸
  TIAN_HU: '天和',            // 庄家起手就和
  DI_HU: '地和'               // 闲家第一圈就和
}

/**
 * 麻将牌类
 */
export class Tile {
  value: number
  type: TileType
  index: number
  display: string
  color: string
  id: string

  constructor(value: number, type: TileType, index: number, display: string, color: string) {
    this.value = value
    this.type = type
    this.index = index
    this.display = display
    this.color = color
    this.id = `${type}-${index}`
  }

  clone(): Tile {
    return new Tile(this.value, this.type, this.index, this.display, this.color)
  }

  /**
   * 是否为幺九牌
   */
  isYaojiu(): boolean {
    if (this.type === TILE_TYPE.JIHAI) return true
    return this.index === 1 || this.index === 9
  }

  /**
   * 是否为字牌
   */
  isZihai(): boolean {
    return this.type === TILE_TYPE.JIHAI
  }

  /**
   * 是否为风牌
   */
  isFeng(): boolean {
    return [TILE_VALUE.EAST, TILE_VALUE.SOUTH, TILE_VALUE.WEST, TILE_VALUE.NORTH].includes(this.value as 31 | 32 | 33 | 34)
  }

  /**
   * 是否为三元牌
   */
  isDragon(): boolean {
    return [TILE_VALUE.WHITE, TILE_VALUE.GREEN, TILE_VALUE.RED].includes(this.value as 35 | 36 | 37)
  }
}

export interface ExposedSet {
  type: 'chi' | 'pon' | 'kan'
  tiles: Tile[]
}

export interface AgariResult {
  agari: boolean
  type?: string
  fan?: number
  isZimo?: boolean
  isDealer?: boolean
  details?: AgariDetails
}

export interface AgariDetails {
  sets: ExposedSet[]
  yan: Tile[] | null
  isMenzen: boolean
  isQingyise: boolean
  isHunyise: boolean
  isPengpeng: boolean
  hasYaojiu: boolean
}

export interface ChiiPattern {
  type: string
  label: string
  tiles: number[]
  allTiles: number[]
}

export interface KakanResult {
  can: boolean
  setIndex?: number
}

export interface ScoreResult {
  base: number
  perPlayer?: number
  total: number
}

export interface CheckAgariOptions {
  isZimo?: boolean
  isDealer?: boolean
  wind?: string
  isGangzimo?: boolean
  isHaidi?: boolean
}

/**
 * 创建完整的牌堆（每种牌 4 张，共 144 张）
 */
export function createDeck(): Tile[] {
  const deck: Tile[] = []

  // 万子
  for (let i = 1; i <= 9; i++) {
    for (let j = 0; j < 4; j++) {
      deck.push(new Tile(TILE_VALUE[`MAN${i}` as keyof typeof TILE_VALUE], TILE_TYPE.MANZU, i, TILE_DISPLAY[`MAN${i}`], TILE_COLOR[`MAN${i}`]))
    }
  }

  // 筒子
  for (let i = 1; i <= 9; i++) {
    for (let j = 0; j < 4; j++) {
      deck.push(new Tile(TILE_VALUE[`PIN${i}` as keyof typeof TILE_VALUE], TILE_TYPE.PINZU, i, TILE_DISPLAY[`PIN${i}`], TILE_COLOR[`PIN${i}`]))
    }
  }

  // 索子
  for (let i = 1; i <= 9; i++) {
    for (let j = 0; j < 4; j++) {
      deck.push(new Tile(TILE_VALUE[`SOU${i}` as keyof typeof TILE_VALUE], TILE_TYPE.SOUZU, i, TILE_DISPLAY[`SOU${i}`], TILE_COLOR[`SOU${i}`]))
    }
  }

  // 风牌
  const winds = ['EAST', 'SOUTH', 'WEST', 'NORTH'] as const
  for (const w of winds) {
    for (let j = 0; j < 4; j++) {
      deck.push(new Tile(TILE_VALUE[w], TILE_TYPE.JIHAI, TILE_VALUE[w] as number, TILE_DISPLAY[w], TILE_COLOR[w]))
    }
  }

  // 三元牌
  const dragons = ['WHITE', 'GREEN', 'RED'] as const
  for (const d of dragons) {
    for (let j = 0; j < 4; j++) {
      deck.push(new Tile(TILE_VALUE[d], TILE_TYPE.JIHAI, TILE_VALUE[d] as number, TILE_DISPLAY[d], TILE_COLOR[d]))
    }
  }

  return deck
}

/**
 * 洗牌
 */
export function shuffleDeck(deck: Tile[]): Tile[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * 牌组类
 */
export class MahjongDeck {
  tiles: Tile[]
  wall: Tile[]
  deadCount: number

  constructor() {
    this.tiles = shuffleDeck(createDeck())
    this.wall = []
    this.deadCount = 0
  }

  /**
   * 摸牌
   */
  draw(): Tile | null {
    if (this.tiles.length === 0) return null
    return this.tiles.pop()!
  }

  /**
   * 剩余牌数
   */
  remaining(): number {
    return this.tiles.length
  }

  /**
   * 是否流局
   */
  isExhausted(): boolean {
    return this.tiles.length <= 0
  }
}

/**
 * 检查是否为顺子（吃出来的）
 */
export function isShuntsu(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false
  if (tiles[0].type !== tiles[1].type || tiles[1].type !== tiles[2].type) return false
  if (tiles[0].type === TILE_TYPE.JIHAI) return false

  const values = tiles.map(t => t.index).sort((a, b) => a - b)
  return values[0] + 1 === values[1] && values[1] + 1 === values[2]
}

/**
 * 检查是否为刻子（碰出来的）
 */
export function isKotsu(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false
  return tiles[0].value === tiles[1].value && tiles[1].value === tiles[2].value
}

/**
 * 检查是否为杠子
 */
export function isKantsu(tiles: Tile[]): boolean {
  if (tiles.length !== 4) return false
  return tiles.every(t => t.value === tiles[0].value)
}

/**
 * 检查是否为眼（雀头）
 */
export function isYan(tiles: Tile[]): boolean {
  if (tiles.length !== 2) return false
  return tiles[0].value === tiles[1].value
}

/**
 * 检查和牌（广东麻将）
 * 返回是否和牌以及番数信息
 */
export function checkAgari(hand: Tile[], exposedSets: ExposedSet[] = [], options: CheckAgariOptions = {}): AgariResult {
  if (!hand) return { agari: false }

  // 过滤掉可能存在的 null 牌，防止崩溃
  const validHand = hand.filter(t => t != null)
  if (validHand.length === 0) return { agari: false }

  const { isZimo = false, isDealer = false, wind = 'east' } = options

  // 必须先排序，保证后续逻辑正确
  const sortedHand = sortHand(validHand)

  // 计算期望手牌数：14 - 3*副露组数
  const exposedCount = exposedSets.length
  const expectedHandSize = 14 - exposedCount * 3

  if (sortedHand.length !== expectedHandSize) {
    return { agari: false }
  }

  // 检查十三幺
  const shisanyao = checkShisanyao(sortedHand)
  if (shisanyao) {
    return {
      agari: true,
      type: '十三幺',
      fan: 13,
      isZimo,
      isDealer
    }
  }

  // 检查标准牌型（4 组 + 1 眼）
  const standard = checkStandard(sortedHand, exposedSets)
  if (standard) {
    const fan = calculateFan(standard, exposedSets, { isZimo, isDealer, wind })
    return {
      agari: true,
      type: standard.type,
      fan,
      isZimo,
      isDealer,
      details: standard.details
    }
  }

  return { agari: false }
}

/**
 * 检查十三幺
 */
function checkShisanyao(hand: Tile[]): boolean {
  if (!hand || hand.length === 0) return false

  const yaojiuValues = [
    TILE_VALUE.MAN1, TILE_VALUE.MAN9,
    TILE_VALUE.PIN1, TILE_VALUE.PIN9,
    TILE_VALUE.SOU1, TILE_VALUE.SOU9,
    TILE_VALUE.EAST, TILE_VALUE.SOUTH, TILE_VALUE.WEST, TILE_VALUE.NORTH,
    TILE_VALUE.WHITE, TILE_VALUE.GREEN, TILE_VALUE.RED
  ]

  const counts: Record<number, number> = {}
  for (const tile of hand) {
    if (!tile) continue
    counts[tile.value] = (counts[tile.value] || 0) + 1
  }

  // 必须有全部 13 种幺九牌
  const keys = Object.keys(counts).map(Number)
  const hasAll = yaojiuValues.every(v => keys.includes(v))
  if (!hasAll) return false

  // 必须有且只有一对
  const pairCount = Object.values(counts).filter(c => c === 2).length
  const singleCount = Object.values(counts).filter(c => c === 1).length

  return pairCount === 1 && singleCount === 12
}

interface StandardResult {
  type: string
  details: AgariDetails
}

/**
 * 检查标准牌型（4 组 + 1 眼）
 */
function checkStandard(hand: Tile[], exposedSets: ExposedSet[] = []): StandardResult | null {
  const details: AgariDetails = {
    sets: [],
    yan: null,
    isMenzen: exposedSets.length === 0,
    isQingyise: false,
    isHunyise: false,
    isPengpeng: false,
    hasYaojiu: true
  }

  // 计算需要从手牌中组成的组数
  const exposedCount = exposedSets.length
  const setsNeeded = 4 - exposedCount

  // 找出所有可能的雀头
  const possibleYans: { value: number; tiles: Tile[]; indices: number[] }[] = []
  for (let i = 0; i < hand.length - 1; i++) {
    if (hand[i].value === hand[i + 1].value) {
      // 避免重复检查相同牌值的对子
      if (possibleYans.length > 0 && possibleYans[possibleYans.length - 1].value === hand[i].value) {
        continue
      }
      possibleYans.push({
        value: hand[i].value,
        tiles: [hand[i], hand[i + 1]],
        indices: [i, i + 1]
      })
    }
  }

  // 对每个可能的雀头，尝试拆解剩余的面子
  for (const yan of possibleYans) {
    const remainingHand = hand.filter((_, idx) => !yan.indices.includes(idx))
    const setsResult = canFormOnlySets(remainingHand, [], setsNeeded)
    if (setsResult) {
      details.sets = setsResult
      details.yan = yan.tiles

      // 判定花色
      const allTiles = [...hand, ...exposedSets.flatMap(s => s.tiles)]
      const types = new Set(allTiles.map(t => t.type))
      const hasJihai = allTiles.some(t => t.type === TILE_TYPE.JIHAI)

      if (types.size === 1 && !hasJihai) {
        details.isQingyise = true
      } else if (types.size === 1 || (types.size === 2 && hasJihai)) {
        details.isHunyise = true
      }

      // 判定碰碰胡
      const allSetsKotsu = [...setsResult, ...exposedSets].every(s => s.type === 'pon' || s.type === 'kan')
      if (allSetsKotsu) {
        details.isPengpeng = true
      }

      // 判定全带幺
      let hasYaojiuEverywhere = true
      for (const set of [...setsResult, ...exposedSets]) {
        if (!set.tiles.some(t => t.isYaojiu())) {
          hasYaojiuEverywhere = false
          break
        }
      }
      if (!yan.tiles.some(t => t.isYaojiu())) {
        hasYaojiuEverywhere = false
      }
      details.hasYaojiu = hasYaojiuEverywhere

      return { type: '鸡平胡', details }
    }
  }

  return null
}

/**
 * 递归检查剩余牌能否完全组成面子
 */
function canFormOnlySets(hand: Tile[], currentSets: ExposedSet[], setsNeeded: number): ExposedSet[] | null {
  if (hand.length === 0) {
    return currentSets.length === setsNeeded ? currentSets : null
  }

  // 取第一张牌，它必须属于某个面子
  const t1 = hand[0]

  // 1. 尝试作为刻子
  const sameCount = hand.filter(t => t.value === t1.value).length
  if (sameCount >= 3) {
    const newHand = [...hand]
    const removed: Tile[] = []
    for (let i = 0; i < 3; i++) {
      const idx = newHand.findIndex(t => t.value === t1.value)
      removed.push(newHand.splice(idx, 1)[0])
    }
    const result = canFormOnlySets(newHand, [...currentSets, { type: 'pon', tiles: removed }], setsNeeded)
    if (result) return result
  }

  // 2. 尝试作为顺子（字牌不行）
  if (t1.type !== TILE_TYPE.JIHAI) {
    const t2Idx = hand.findIndex(t => t.type === t1.type && t.index === t1.index + 1)
    const t3Idx = hand.findIndex(t => t.type === t1.type && t.index === t1.index + 2)

    if (t2Idx !== -1 && t3Idx !== -1) {
      const newHand = [...hand]
      // 注意删除顺序，从大到小，避免索引偏移影响
      const indices = [0, t2Idx, t3Idx].sort((a, b) => b - a)
      const removed: Tile[] = []
      for (const idx of indices) {
        removed.unshift(newHand.splice(idx, 1)[0])
      }
      const result = canFormOnlySets(newHand, [...currentSets, { type: 'chi', tiles: removed }], setsNeeded)
      if (result) return result
    }
  }

  return null
}


/**
 * 计算番数（广东麻将）
 */
export function calculateFan(details: StandardResult, exposedSets: ExposedSet[], options: CheckAgariOptions): number {
  let fan = 0
  const { isZimo = false } = options

  // 鸡平胡基础
  if (details.type === '鸡平胡') {
    fan = 1
  }

  // 门前清
  if (details.details.isMenzen) {
    fan += 1
  }

  // 自摸
  if (isZimo) {
    fan += 1
  }

  // 清一色
  if (details.details.isQingyise) {
    fan = 6
  }

  // 混一色
  if (details.details.isHunyise && !details.details.isQingyise) {
    fan = Math.max(fan, 3)
  }

  // 碰碰胡
  if (details.details.isPengpeng) {
    fan = Math.max(fan, 3)
  }

  // 混全带幺九
  if (details.details.hasYaojiu) {
    fan = Math.max(fan, 2)
  }

  // 检查番种
  const fanTypes = checkFanTypes(details, exposedSets, options)
  for (const ft of fanTypes) {
    fan = Math.max(fan, ft.fan)
  }

  return fan
}

interface FanTypeResult {
  name: string
  fan: number
}

/**
 * 检查特殊番型
 */
function checkFanTypes(_details: StandardResult, exposedSets: ExposedSet[], options: CheckAgariOptions): FanTypeResult[] {
  const fanTypes: FanTypeResult[] = []

  // 大三元
  const dragons = [TILE_VALUE.WHITE, TILE_VALUE.GREEN, TILE_VALUE.RED] as const
  let dragonKotsu = 0
  for (const set of exposedSets) {
    if (set.type === 'pon' || set.type === 'kan') {
      if ((dragons as readonly number[]).includes(set.tiles[0].value)) {
        dragonKotsu++
      }
    }
  }
  if (dragonKotsu === 3) {
    fanTypes.push({ name: '大三元', fan: 13 })
  } else if (dragonKotsu === 2) {
    fanTypes.push({ name: '小三元', fan: 6 })
  }

  // 大四喜、小四喜
  const winds = [TILE_VALUE.EAST, TILE_VALUE.SOUTH, TILE_VALUE.WEST, TILE_VALUE.NORTH] as const
  let windKotsu = 0
  for (const set of exposedSets) {
    if (set.type === 'pon' || set.type === 'kan') {
      if ((winds as readonly number[]).includes(set.tiles[0].value)) {
        windKotsu++
      }
    }
  }
  if (windKotsu === 4) {
    fanTypes.push({ name: '大四喜', fan: 13 })
  } else if (windKotsu === 3) {
    fanTypes.push({ name: '小四喜', fan: 9 })
  }

  // 杠上开花
  if (options.isGangzimo) {
    fanTypes.push({ name: '杠上开花', fan: 3 })
  }

  // 海底捞月
  if (options.isHaidi) {
    fanTypes.push({ name: '海底捞月', fan: 3 })
  }

  return fanTypes
}

/**
 * 检查是否能吃
 */
export function canChii(hand: Tile[], discardedTile: Tile): ChiiPattern[] {
  // 字牌不能吃
  if (discardedTile.type === TILE_TYPE.JIHAI) return []

  const chiiPatterns: ChiiPattern[] = []

  // 检查能否组成顺子：(x-1,x,x+1), (x,x+1,x+2), (x-2,x-1,x)
  const patterns = [
    { needs: [discardedTile.index - 1, discardedTile.index + 1], type: 'mid', label: '夹吃' },
    { needs: [discardedTile.index + 1, discardedTile.index + 2], type: 'low', label: '边吃' },
    { needs: [discardedTile.index - 2, discardedTile.index - 1], type: 'high', label: '边吃' }
  ]

  for (const pattern of patterns) {
    if (pattern.needs.some(n => n < 1 || n > 9)) continue

    const handTiles = hand.filter(t => t.type === discardedTile.type)
    const indices = handTiles.map(t => t.index)

    const hasBoth = pattern.needs.every(n => indices.includes(n))
    if (hasBoth) {
      // 返回完整的顺子（包括别人打的牌）
      const allTiles = [discardedTile.index, ...pattern.needs].sort((a, b) => a - b)
      chiiPatterns.push({
        type: pattern.type,
        label: pattern.label,
        tiles: pattern.needs,
        allTiles
      })
    }
  }

  return chiiPatterns
}

/**
 * 检查是否能碰
 */
export function canPon(hand: Tile[], discardedTile: Tile): boolean {
  const count = hand.filter(t => t.value === discardedTile.value).length
  return count >= 2
}

/**
 * 检查是否能大明杠
 */
export function canDaiminkan(hand: Tile[], discardedTile: Tile): boolean {
  const count = hand.filter(t => t.value === discardedTile.value).length
  return count === 3
}

/**
 * 检查是否能加杠
 */
export function canKakan(exposedSets: ExposedSet[], drawnTile: Tile): KakanResult {
  for (const set of exposedSets) {
    if (set.type === 'pon' && set.tiles.length === 3) {
      if (set.tiles[0].value === drawnTile.value) {
        return { can: true, setIndex: exposedSets.indexOf(set) }
      }
    }
  }
  return { can: false }
}

/**
 * 检查是否能暗杠
 */
export function canAnkan(hand: Tile[]): Tile[] {
  const ankanTiles: Tile[] = []
  const counts: Record<number, number> = {}

  for (const tile of hand) {
    counts[tile.value] = (counts[tile.value] || 0) + 1
  }

  for (const value in counts) {
    if (counts[value] === 4) {
      const tile = hand.find(t => t.value === parseInt(value))
      if (tile) {
        ankanTiles.push(tile)
      }
    }
  }

  return ankanTiles
}

/**
 * 检查是否能和（荣和）
 */
export function canRon(hand: Tile[], discardedTile: Tile, exposedSets: ExposedSet[] = []): boolean {
  const testHand = [...hand, discardedTile]
  return checkAgari(testHand, exposedSets).agari
}

/**
 * 计算得分（广东麻将）
 * 番数对应分数
 */
export function calculateScore(fan: number, isDealer: boolean = false, isZimo: boolean = false): ScoreResult {
  // 广东麻将常见番数对应的分数
  const scoreTable: Record<number, { base: number }> = {
    0: { base: 0 },
    1: { base: isDealer ? 2 : 1 },
    2: { base: isDealer ? 4 : 2 },
    3: { base: isDealer ? 8 : 4 },
    4: { base: isDealer ? 16 : 8 },
    5: { base: isDealer ? 32 : 16 },
    6: { base: isDealer ? 64 : 32 },
  }

  // 满番（7 番及以上）
  if (fan >= 7) {
    if (fan >= 13) {
      // 役满
      return {
        base: 1000,
        total: isDealer ? (isZimo ? 4000 : 2000) : (isZimo ? 2000 : 1000)
      }
    }
    // 8-12 番
    return {
      base: 500,
      total: isDealer ? (isZimo ? 2000 : 1000) : (isZimo ? 1000 : 500)
    }
  }

  const base = scoreTable[fan]?.base || 1
  let total = base

  if (isZimo) {
    // 自摸：三家各付
    total = base * (isDealer ? 3 : 2)
    return {
      base,
      perPlayer: isDealer ? base : base,
      total: total * base / 10  // 简化计算
    }
  } else {
    // 荣和：放铳者付
    total = base * 2
    return {
      base,
      total: total * base / 10
    }
  }
}

/**
 * 获取宝牌指示牌对应的宝牌（广东麻将一般不用，但有些变体使用）
 */
export function getDoraFromIndicator(indicator: Tile | null): number | null {
  if (!indicator) return null

  if (indicator.type === TILE_TYPE.JIHAI) {
    // 字牌顺序：东→南→西→北→东，白→发→中→白
    const feng = [TILE_VALUE.EAST, TILE_VALUE.SOUTH, TILE_VALUE.WEST, TILE_VALUE.NORTH] as const
    const dragons = [TILE_VALUE.WHITE, TILE_VALUE.GREEN, TILE_VALUE.RED] as const

    if ((feng as readonly number[]).includes(indicator.value)) {
      const idx = (feng as readonly number[]).indexOf(indicator.value)
      return feng[(idx + 1) % 4]
    }
    if ((dragons as readonly number[]).includes(indicator.value)) {
      const idx = (dragons as readonly number[]).indexOf(indicator.value)
      return dragons[(idx + 1) % 3]
    }
  } else {
    // 数牌：1-9 循环
    const base = Math.floor(indicator.value / 10) * 10
    const idx = indicator.index
    const nextIdx = idx >= 9 ? 1 : idx + 1
    return base + nextIdx
  }

  return null
}

/**
 * 牌的 JSON 序列化
 */
export function tileToJSON(tile: Tile): Record<string, unknown> {
  return {
    value: tile.value,
    type: tile.type,
    index: tile.index,
    display: tile.display,
    color: tile.color
  }
}

/**
 * 从 JSON 创建牌
 */
export function tileFromJSON(json: Record<string, unknown>): Tile {
  return new Tile(
    json.value as number,
    json.type as TileType,
    json.index as number,
    json.display as string,
    json.color as string
  )
}

/**
 * 手牌排序（方便查看）
 */
export function sortHand(hand: Tile[]): Tile[] {
  const typeOrder = [TILE_TYPE.MANZU, TILE_TYPE.PINZU, TILE_TYPE.SOUZU, TILE_TYPE.JIHAI]

  return [...hand].sort((a, b) => {
    const typeDiff = typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
    if (typeDiff !== 0) return typeDiff
    return a.index - b.index
  })
}