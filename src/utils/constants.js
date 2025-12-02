export const ALLOWED_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.tga', '.tif', '.tiff', '.bmp', '.psd',
    '.fbx', '.obj', '.gltf', '.glb', '.ma', '.mb', '.blend',
    '.mp3', '.wav', '.ogg',
    '.mp4', '.webm'
]

export const MODEL_EXTENSIONS = ['.fbx', '.obj', '.gltf', '.glb', '.ma', '.mb', '.blend']
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.tga', '.tif', '.tiff', '.bmp', '.psd']
export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg']
export const VIDEO_EXTENSIONS = ['.mp4', '.webm']

export const IGNORED_FOLDERS = [
    'node_modules', '.git', '.vscode', '.idea', '.vs', // IDEs
    'dist', 'build', 'out', 'target', 'bin', // Build artifacts
    'coverage', '__pycache__', // Tests/Languages
    'vendor', 'lib', 'libs', 'include', // Dependencies
    'tmp', 'temp', 'logs', '.next', '.nuxt', '.cache', // Temp/Cache
    'venv', 'env', '.env', // Python/Env
    'Library', 'ProjectSettings', 'UserSettings', // Unity (optional, but good for speed)
    'DerivedData', 'Pods', // iOS
    '.gradle', '.android' // Android
]
