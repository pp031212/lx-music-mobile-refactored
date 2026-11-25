export const DOWNLOAD_QUALITIES: LX.Quality[] = ['128k', '192k', '320k', 'flac', 'flac24bit', 'ape', 'wav']

export const supportsDownloadQuality = (music: LX.Music.MusicInfoOnline, quality: LX.Quality, sourceQualities: LX.QualityList) => {
  return !!sourceQualities[music.source]?.includes(quality) && !!music.meta._qualitys[quality]
}
