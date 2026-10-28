// Obsidian Kinetic Glass tokens. Native surfaces use layered opacity and
// shadows instead of web-only backdrop-filter so they remain Expo compatible.
export const colors = {
  dark: {
    background: '#090D10', surface: '#121A21', surfaceRaised: '#172129', surfaceMuted: '#0E151A',
    text: '#F2F7F6', textSecondary: '#93A6A3', primary: '#00F5D4', primaryDim: '#05D5AA', accent: '#26FEDC',
    border: '#2A3A3D', borderSoft: 'rgba(255,255,255,0.10)', glass: 'rgba(18, 26, 33, 0.88)',
    miss: '#52635F', success: '#10B981', danger: '#FF7185', scoreBackground: '#0B1217',
  },
  light: {
    background: '#F3FAF8', surface: '#FFFFFF', surfaceRaised: '#E7F3F0', surfaceMuted: '#DDECE8',
    text: '#10201E', textSecondary: '#56706B', primary: '#007D6B', primaryDim: '#04977E', accent: '#006C5C',
    border: '#C7DBD6', borderSoft: 'rgba(0, 56, 47, 0.12)', glass: '#FFFFFF',
    miss: '#70837F', success: '#07855E', danger: '#C93D52', scoreBackground: '#EDF7F4',
  }
};
