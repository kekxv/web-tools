import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PhoneLockView from '../views/PhoneLockView.vue'
import { createChallenge, encodeChallenge } from '../utils/phone-lock-challenge'

/**
 * 猜密码：完整流程测试
 * 设置密码 -> 锁定 -> 交接 -> 猜密码 -> 解锁 / 停用
 */

const stubs = {
  'el-switch': true,
  'el-button': { template: '<button class="el-button"><slot /></button>' }
}

/** 用物理键盘输入一串数字（组件监听 window keydown） */
async function type(wrapper, digits) {
  for (const digit of digits) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: digit }))
    await wrapper.vm.$nextTick()
  }
}

/** 输入两次密码，停在「留提示」这一步 */
async function enterPasscode(wrapper, passcode = '1234') {
  await type(wrapper, passcode)
  await type(wrapper, passcode)
}

/** 点「锁定手机」，进入交接页 */
async function lockPhone(wrapper) {
  await wrapper.find('.hint-step .primary-btn').trigger('click')
}

/** 点「开始猜密码」，进入锁屏页 */
async function startGuessing(wrapper) {
  await wrapper.find('.handoff-screen .primary-btn').trigger('click')
}

/** 找到信息面板里的按钮 */
function panelButton(wrapper, text) {
  return wrapper.findAll('.panel-actions button').find((btn) => btn.text().includes(text))
}

afterEach(() => {
  vi.useRealTimers()
})

// 测试里用低迭代次数，跑得快
async function makeToken(passcode) {
  return encodeChallenge(await createChallenge(passcode, 10000))
}

/** 挑战模式下校验要真跑一次 KDF，等它落地 */
async function settle(wrapper) {
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 40))
  await flushPromises()
  await wrapper.vm.$nextTick()
}

/** 等错误动画结束：密码点会在 600ms 后清空，期间不接收新输入 */
async function waitForReset() {
  await new Promise((resolve) => setTimeout(resolve, 650))
  await flushPromises()
}

beforeEach(() => {
  window.location.hash = ''
})

describe('PhoneLockView', () => {
  it('初始进入设置密码阶段', () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    expect(wrapper.find('.setup-screen').exists()).toBe(true)
    expect(wrapper.find('.setup-title').text()).toBe('设置密码')
    expect(wrapper.findAll('.dots .dot')).toHaveLength(4)
    wrapper.unmount()
  })

  it('两次输入不一致时提示重新设置', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await type(wrapper, '1234')
    expect(wrapper.find('.setup-title').text()).toBe('请再次输入')

    await type(wrapper, '5678')
    expect(wrapper.find('.setup-title').text()).toBe('设置密码')
    expect(wrapper.find('.setup-error').text()).toBe('两次输入不一致，请重新设置')
    expect(wrapper.find('.dots').classes()).toContain('is-error')
    wrapper.unmount()
  })

  it('支持 6 位密码', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await wrapper.findAll('.segmented button')[1].trigger('click')
    expect(wrapper.findAll('.dots .dot')).toHaveLength(6)

    await enterPasscode(wrapper, '135790')
    expect(wrapper.find('.hint-step').exists()).toBe(true)
    wrapper.unmount()
  })

  it('可以留提示语，猜的人能点「提示」查看', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await enterPasscode(wrapper)

    await wrapper.find('.hint-input').setValue('我的生日后两位')
    await lockPhone(wrapper)

    expect(wrapper.find('.handoff-screen').exists()).toBe(true)
    expect(wrapper.find('.handoff-hint').text()).toContain('我的生日后两位')

    await startGuessing(wrapper)
    expect(wrapper.find('.lock-screen').exists()).toBe(true)

    await wrapper.findAll('.keypad-panel .key-action')[0].trigger('click')
    expect(wrapper.find('.prompt-text').text()).toContain('我的生日后两位')
    wrapper.unmount()
  })

  it('密码正确时解锁并进入桌面', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await enterPasscode(wrapper, '1234')
    await lockPhone(wrapper)
    await startGuessing(wrapper)

    await type(wrapper, '12')
    expect(wrapper.find('.lock-screen').exists()).toBe(true)

    await type(wrapper, '34')
    expect(wrapper.find('.home-screen').exists()).toBe(true)
    expect(wrapper.find('.unlock-badge').text()).toContain('解锁成功')
    expect(wrapper.findAll('.app-grid .app')).toHaveLength(8)
    wrapper.unmount()
  })

  it('开始猜密码进入沉浸全屏，猜对后仍留在全屏，点图标才退出', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })

    // 设置密码、交接阶段都还不是全屏
    expect(wrapper.classes()).not.toContain('is-immersive')
    expect(wrapper.find('.immersive-exit').exists()).toBe(false)
    await enterPasscode(wrapper, '1234')
    await lockPhone(wrapper)
    expect(wrapper.classes()).not.toContain('is-immersive')

    // 开始猜密码 -> 全屏，退出图标出现
    await startGuessing(wrapper)
    expect(wrapper.classes()).toContain('is-immersive')
    expect(wrapper.find('.immersive-exit').exists()).toBe(true)

    // 猜对进桌面：不自动退出，还要能手动点掉
    await type(wrapper, '1234')
    expect(wrapper.find('.home-screen').exists()).toBe(true)
    expect(wrapper.classes()).toContain('is-immersive')
    expect(wrapper.find('.immersive-exit').exists()).toBe(true)

    await wrapper.find('.immersive-exit').trigger('click')
    expect(wrapper.classes()).not.toContain('is-immersive')
    expect(wrapper.find('.home-screen').exists()).toBe(true)
    wrapper.unmount()
  })

  it('手机上沉浸时锁屏层挂到 body 上（躲开 iOS 滚动容器让 fixed 失效的问题）', async () => {
    const original = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('any-pointer: coarse'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    }))
    try {
      const wrapper = mount(PhoneLockView, { global: { stubs } })
      await enterPasscode(wrapper, '1234')
      await lockPhone(wrapper)
      await startGuessing(wrapper)
      await flushPromises()

      // 锁屏层被传送到 body，不再是 .phone-lock-view 的后代
      expect(document.body.querySelector('.phone-lock-view .phone-screen')).toBe(null)
      const screen = document.body.querySelector('.phone-screen')
      expect(screen).not.toBe(null)
      expect(screen.classList.contains('is-immersive-screen')).toBe(true)

      wrapper.unmount()
      expect(document.body.querySelector('.phone-screen')).toBe(null)
    } finally {
      window.matchMedia = original
    }
  })

  it('猜的过程中点退出全屏：已输入的位数不丢，也不会自己弹回去', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await enterPasscode(wrapper, '1234')
    await lockPhone(wrapper)
    await startGuessing(wrapper)
    await type(wrapper, '12')
    expect(wrapper.findAll('.dot.is-filled')).toHaveLength(2)

    await wrapper.find('.immersive-exit').trigger('click')
    expect(wrapper.classes()).not.toContain('is-immersive')
    expect(wrapper.find('.lock-screen').exists()).toBe(true)
    expect(wrapper.findAll('.dot.is-filled')).toHaveLength(2)

    await type(wrapper, '3')
    expect(wrapper.classes()).not.toContain('is-immersive')
    expect(wrapper.findAll('.dot.is-filled')).toHaveLength(3)
    wrapper.unmount()
  })

  it('密码错误时只提示剩余机会，不给任何命中线索', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await enterPasscode(wrapper, '1234')
    await lockPhone(wrapper)
    await startGuessing(wrapper)

    await type(wrapper, '1290')
    expect(wrapper.find('.prompt-sub').text()).toContain('密码错误，还可尝试 4 次')
    expect(wrapper.find('.dots').classes()).toContain('is-error')

    // 只记录「试过哪些密码」，不透露对了几位
    const record = wrapper.find('.history-item')
    expect(record.find('.history-guess').text()).toBe('1 2 9 0')
    expect(record.find('.history-times').text()).toBe('第 1 次')
    expect(wrapper.text()).not.toContain('位置正确')
    expect(wrapper.text()).not.toContain('数字正确')
    wrapper.unmount()
  })

  it('猜测记录保留全部，次数是真实的第几次（截断后也不会错位）', async () => {
    vi.useFakeTimers()
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await enterPasscode(wrapper, '1234')
    await lockPhone(wrapper)
    await startGuessing(wrapper)

    for (let i = 0; i < 5; i++) {
      await type(wrapper, String(i + 1).repeat(4))
      await vi.advanceTimersByTimeAsync(600)
    }
    // 5 次猜错会停用手机，等倒计时走完再补第 6 次
    await vi.advanceTimersByTimeAsync(6000)
    await type(wrapper, '9999')
    await vi.advanceTimersByTimeAsync(600)

    const items = wrapper.findAll('.history-item')
    expect(items).toHaveLength(6)
    // 最新的排最上面，次数按真实顺序编
    expect(items[0].find('.history-guess').text()).toBe('9 9 9 9')
    expect(items[0].find('.history-times').text()).toBe('第 6 次')
    expect(items[5].find('.history-guess').text()).toBe('1 1 1 1')
    expect(items[5].find('.history-times').text()).toBe('第 1 次')
    expect(wrapper.find('.history-count').text()).toBe('共 6 次')
    wrapper.unmount()
  })

  it('连续猜错 5 次会停用手机，倒计时结束后恢复', async () => {
    vi.useFakeTimers()
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await enterPasscode(wrapper, '1234')
    await lockPhone(wrapper)
    await startGuessing(wrapper)

    for (let i = 0; i < 4; i++) {
      await type(wrapper, '0000')
      await vi.advanceTimersByTimeAsync(600)
    }
    // 第 5 次猜错触发停用
    await type(wrapper, '0000')

    expect(wrapper.find('.prompt-text').text()).toBe('iPhone 已停用')
    expect(wrapper.find('.prompt-lockout').text()).toContain('0:05')
    expect(wrapper.find('.passcode-keypad').classes()).toContain('is-disabled')

    await vi.advanceTimersByTimeAsync(5000)
    expect(wrapper.find('.prompt-lockout').exists()).toBe(false)
    expect(wrapper.find('.passcode-keypad').classes()).not.toContain('is-disabled')

    // 停用解除后依然可以猜对
    await type(wrapper, '1234')
    expect(wrapper.find('.home-screen').exists()).toBe(true)
    wrapper.unmount()
  })

  it('猜对之后可以再锁一次，让下一个人来猜', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await enterPasscode(wrapper, '4321')
    await lockPhone(wrapper)
    await startGuessing(wrapper)

    await type(wrapper, '4321')
    expect(wrapper.find('.home-screen').exists()).toBe(true)

    await panelButton(wrapper, '再锁一次').trigger('click')
    expect(wrapper.find('.handoff-screen').exists()).toBe(true)

    // 重新开始猜：计数清零，且密码没有泄露在页面上
    await startGuessing(wrapper)
    expect(wrapper.text()).not.toContain('4 3 2 1')
    wrapper.unmount()
  })

  it('不提供任何泄露密码的功能（命中提示 / 揭晓答案）', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await enterPasscode(wrapper, '1357')
    await lockPhone(wrapper)
    await startGuessing(wrapper)

    // 没有「破解提示」开关、没有命中分析、没有揭晓答案入口
    expect(wrapper.find('.switch-row').exists()).toBe(false)
    expect(wrapper.find('.reveal-overlay').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('破解')
    expect(wrapper.text()).not.toContain('揭晓')
    expect(wrapper.text()).not.toContain('位置正确')
    expect(wrapper.text()).not.toContain('1 3 5 7')

    // 猜错多次也不会泄露密码
    await type(wrapper, '1358')
    await type(wrapper, '2468')
    expect(wrapper.text()).not.toContain('1 3 5 7')
    expect(wrapper.text()).not.toContain('位置正确')

    const buttons = wrapper.findAll('.panel-actions button').map((b) => b.text())
    expect(buttons.join(' ')).not.toContain('揭晓')
    wrapper.unmount()
  })

  it('键盘上不存在的按键不会误输入，删除键可以退格', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })

    await type(wrapper, '12')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.dots .dot.is-filled')).toHaveLength(1)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.dots .dot.is-filled')).toHaveLength(1)
    wrapper.unmount()
  })

  it('打开带挑战码的链接会直接进入猜密码，密码不在本地也不在页面上', async () => {
    const token = await makeToken('2468')
    window.location.hash = `#/phone-lock?c=${token}`

    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await settle(wrapper)

    expect(wrapper.find('.lock-screen').exists()).toBe(true)
    expect(wrapper.findAll('.dots .dot')).toHaveLength(4)
    expect(wrapper.find('.phase-chip').text()).toBe('接受挑战中')
    // 关键：密码原文既不在组件状态里，也不在页面上
    expect(wrapper.vm.passcode).toBe('')
    expect(wrapper.text()).not.toContain('2468')

    // 猜错只报错，不给线索
    await type(wrapper, '1357')
    await settle(wrapper)
    expect(wrapper.find('.prompt-sub').text()).toContain('密码错误')
    expect(wrapper.text()).not.toContain('位置正确')

    // 猜对才放行（先等上一次的错误动画收尾）
    await waitForReset()
    await type(wrapper, '2468')
    await settle(wrapper)
    expect(wrapper.find('.home-screen').exists()).toBe(true)
    expect(wrapper.find('.phase-chip').text()).toBe('挑战成功')

    wrapper.unmount()
  })

  it('挑战模式下能滚到零再重来，也可以退出挑战', async () => {
    const token = await makeToken('1357')
    window.location.hash = `#/phone-lock?c=${token}`
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await settle(wrapper)

    await type(wrapper, '1357')
    await settle(wrapper)
    expect(wrapper.find('.home-screen').exists()).toBe(true)

    await panelButton(wrapper, '再锁一次').trigger('click')
    expect(wrapper.find('.handoff-screen').exists()).toBe(true)

    await startGuessing(wrapper)
    expect(wrapper.find('.lock-screen').exists()).toBe(true)

    await panelButton(wrapper, '退出挑战').trigger('click')
    expect(wrapper.find('.setup-screen').exists()).toBe(true)
    expect(wrapper.vm.challenge).toBeNull()
    wrapper.unmount()
  })

  it('可以粘贴挑战码开始挑战，乱码会给出提示', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    const input = wrapper.find('.challenge-input')

    await input.setValue('这不是挑战码')
    await wrapper.find('.challenge-card .el-button').trigger('click')
    expect(wrapper.find('.share-error').text()).toContain('无法识别')
    expect(wrapper.find('.setup-screen').exists()).toBe(true)

    await input.setValue(await makeToken('9876'))
    await wrapper.find('.challenge-card .el-button').trigger('click')
    await settle(wrapper)
    expect(wrapper.find('.lock-screen').exists()).toBe(true)
    expect(wrapper.findAll('.dots .dot')).toHaveLength(4)

    wrapper.unmount()
  })

  it('六位挑战码会画六个点，并且只认六位输入', async () => {
    const token = await makeToken('135790')
    window.location.hash = `#/phone-lock?c=${token}`
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await settle(wrapper)

    expect(wrapper.findAll('.dots .dot')).toHaveLength(6)

    await type(wrapper, '1357')
    await settle(wrapper)
    // 只输了四位，还没提交
    expect(wrapper.find('.home-screen').exists()).toBe(false)

    await type(wrapper, '90')
    await settle(wrapper)
    expect(wrapper.find('.home-screen').exists()).toBe(true)
    wrapper.unmount()
  })

  it('设置密码后可以生成挑战链接，链接里只有哈希、没有密码', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await enterPasscode(wrapper, '2468')
    await lockPhone(wrapper)

    const shareCard = wrapper.find('.share-card')
    expect(shareCard.exists()).toBe(true)
    // 分享前不该出现链接
    expect(shareCard.find('.share-input').exists()).toBe(false)

    await shareCard.find('.el-button').trigger('click')
    // 生成链接要跑一次真实迭代次数的 KDF，等它出现
    await vi.waitFor(
      () => {
        expect(wrapper.find('.share-input').exists()).toBe(true)
      },
      { timeout: 15000 }
    )

    const link = wrapper.find('.share-input').element.value
    expect(link).toContain('#/phone-lock?c=v1.4.')
    expect(link).not.toContain('2468')
    expect(wrapper.text()).not.toContain('2468')

    // 4 位密码会被提醒换成 6 位
    expect(wrapper.find('.share-facts').text()).toContain('4 位')

    wrapper.unmount()
  })

  it('重新设置密码会清空上一局状态', async () => {
    const wrapper = mount(PhoneLockView, { global: { stubs } })
    await enterPasscode(wrapper, '1234')
    await lockPhone(wrapper)
    await startGuessing(wrapper)
    await type(wrapper, '5678')

    await panelButton(wrapper, '重新设置密码').trigger('click')
    expect(wrapper.find('.setup-screen').exists()).toBe(true)
    expect(wrapper.findAll('.dots .dot.is-filled')).toHaveLength(0)
    wrapper.unmount()
  })
})
