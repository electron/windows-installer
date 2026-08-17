const fs = require('fs');
const os = require('os');

/**
 * Even if we're cross-compiling for a different arch like arm64,
 * we still need to use the 7-Zip executable for the host arch
 */
const arch = os.arch();

if (arch !== 'x64' && arch !== 'arm64') {
    console.warn('electron-winstaller: 32-bit build machines are not supported; installer creation will fail on this machine.');
    process.exit(0);
}

console.log('Selecting 7-Zip for arch ' + arch);

// Verify Windows platform
try {
    if (os.platform() !== 'win32') {
        console.log('is not Windows');
        process.exit(0);
    }
} catch (err) {
    throw err;
}


// Copy the 7-Zip executable for the configured architecture.
try {
    fs.copyFileSync('vendor/7z-' + arch + '.exe', 'vendor/7z.exe');
} catch (err) {
    throw err;
}

try {
    fs.copyFileSync('vendor/7z-' + arch + '.dll', 'vendor/7z.dll');
} catch (err) {
    throw err;
}
