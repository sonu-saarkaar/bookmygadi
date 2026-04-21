const fs = require('fs');

const drawableXML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#1c1c1e" />
    <stroke android:width="2dp" android:color="#10B981" />
</shape>`;

fs.writeFileSync('C:\\Users\\mdasi\\Project\\bookmygadi\\bookmygadi-main\\android\\app-rider\\src\\main\\res\\drawable\\circle_bg.xml', drawableXML, 'utf8');

const layoutPath = 'C:\\Users\\mdasi\\Project\\bookmygadi\\bookmygadi-main\\android\\app-rider\\src\\main\\res\\layout\\layout_floating_widget.xml';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');
if (layoutContent.charCodeAt(0) === 0xFEFF) {
    layoutContent = layoutContent.slice(1);
    fs.writeFileSync(layoutPath, layoutContent, 'utf8');
}
console.log('done');