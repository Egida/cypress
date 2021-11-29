import path from 'path'
import chokidar from 'chokidar'

import type { DataContext } from '..'
import type { FSWatcher } from 'fs'

export class DevActions {
  private _chokidar?: FSWatcher

  static get CY_STATE_PATH () {
    return path.join(__dirname, '../..', 'node_modules', '.cystate')
  }

  static get CY_TRIGGER_UPDATE () {
    return path.join(__dirname, '../..', 'node_modules', '.cystate-update')
  }

  constructor (private ctx: DataContext) {}

  watchForRelaunch () {
    // When we see changes to the .cystate file, we trigger a notification to the frontend
    if (!this._chokidar) {
      this._chokidar = chokidar.watch(DevActions.CY_STATE_PATH, {
        ignoreInitial: true,
      })

      this._chokidar.on('change', () => {
        this.ctx.update((o) => {
          o.dev.refreshState = new Date().toISOString()
        })

        this.ctx.emitter.toApp()
        this.ctx.emitter.toLaunchpad()
      })
    }
  }

  // In a setTimeout so that we flush the triggering response to the client before sending
  triggerRelaunch () {
    setTimeout(async () => {
      try {
        await this.ctx.destroy()
      } catch (e) {
        this.ctx.logError(e)
      } finally {
        process.exitCode = 0
        await this.ctx.fs.writeFile(DevActions.CY_TRIGGER_UPDATE, JSON.stringify(new Date()))
      }
    }, 10)
  }

  dismissRelaunch () {
    this.ctx.update((o) => {
      o.dev.refreshState = null
    })
  }

  dispose () {
    this._chokidar?.close()
    this._chokidar = undefined
  }
}