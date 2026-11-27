const { test } = require('node:test')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

test('ten-band EQ and linked compressor match desktop PCM at 44.1 and 48 kHz', t => {
  const classes = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-eq-'))
  t.after(() => fs.rmSync(classes, { recursive: true, force: true }))
  const jdk = name => process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? name + '.exe' : name)
    : name
  const effects = path.resolve(__dirname, '../android/audio-effects')
  execFileSync(jdk('javac'), [
    '-d', classes,
    path.join(effects, 'TenBandEqualizer.java'),
    path.join(effects, 'WebAudioCompressor.java'),
    path.join(__dirname, 'EqualizerReference.java'),
  ])
  execFileSync(jdk('java'), ['-cp', classes, 'com.guichaguri.trackplayer.service.EqualizerReference'])
})
