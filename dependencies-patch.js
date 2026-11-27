const fs = require('node:fs')
const path = require('node:path')

const playerRoot = path.join(__dirname, 'node_modules', 'react-native-track-player', 'android', 'src', 'main', 'java', 'com', 'guichaguri', 'trackplayer', 'service')
const effectsRoot = path.join(__dirname, 'android', 'audio-effects')
const patches = {
  'MusicManager.java': [
    [
      'import androidx.media3.exoplayer.DefaultLoadControl;\nimport androidx.media3.exoplayer.DefaultRenderersFactory;\n',
      'import androidx.media3.exoplayer.DefaultLoadControl;\nimport com.guichaguri.trackplayer.service.AudioEffects.RenderersFactory;\n',
    ],
    [
      'DefaultRenderersFactory renderersFactory = new DefaultRenderersFactory(service);',
      'RenderersFactory renderersFactory = new RenderersFactory(service);',
    ],
    [
      'return new LocalPlayback(service, this, player, cacheMaxSize, autoUpdateMetadata);',
      'AudioEffects.attach(player, renderersFactory, shouldEnableAudioOffload);\n        return new LocalPlayback(service, this, player, cacheMaxSize, autoUpdateMetadata);',
    ],
  ],
  'player/ExoPlayback.java': [
    [
      'import com.guichaguri.trackplayer.service.MusicManager;',
      'import com.guichaguri.trackplayer.service.AudioEffects;\nimport com.guichaguri.trackplayer.service.MusicManager;',
    ],
    [
      'public void destroy() {\n        player.release();',
      'public void destroy() {\n        AudioEffects.detach(player);\n        player.release();',
    ],
  ],
}

function preparePatch(relativePath, replacements) {
  const filename = path.join(playerRoot, relativePath)
  const original = fs.readFileSync(filename, 'utf8')
  const newline = original.includes('\r\n') ? '\r\n' : '\n'
  let content = original
  for (const [from, to] of replacements) {
    const before = from.replace(/\n/g, newline)
    const after = to.replace(/\n/g, newline)
    if (content.includes(after)) continue
    if (content.split(before).length !== 2) {
      throw new Error(`The installed react-native-track-player is incompatible with the audio effects integration (${relativePath}). Install the locked dependencies with npm ci.`)
    }
    content = content.replace(before, after)
  }
  return { filename, original, content }
}

const changes = Object.entries(patches).map(([file, replacements]) => preparePatch(file, replacements))
for (const { filename, original, content } of changes) {
  if (content !== original) fs.writeFileSync(filename, content)
}
for (const file of ['AudioEffects.java', 'SpectrumAnalyzer.java', 'TenBandEqualizer.java', 'WebAudioCompressor.java', 'SpatialPanner.java']) {
  const content = fs.readFileSync(path.join(effectsRoot, file))
  const destination = path.join(playerRoot, file)
  if (!fs.existsSync(destination) || !content.equals(fs.readFileSync(destination))) {
    fs.writeFileSync(destination, content)
  }
}
