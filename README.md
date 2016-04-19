#Webshot
Small nodejs server for taking screenshots.

Usage:
http://webshot.local:8080?url=[url]

Replace url with the actual url you want to take a screenshot from.

##Parameters
<table>
    <tr>
        <td>Parameter</td>
        <td>Alias</td>
        <td>Description</td>
    </tr>
    <tr>
        <td>url*</td>
        <td>u</td>
        <td>URL from the website to take the website from</td>
    </tr>
    <tr>
        <td>height</td>
        <td>h</td>
        <td>Height of the screen resolution (Default: 1080)</td>
    </tr>
    <tr>
        <td>width</td>
        <td>w</td>
        <td>Width of the screen resolution (Default: 1080)</td>
    </tr>
    <tr>
        <td>quality</td>
        <td>q</td>
        <td>JPEG compression quality. A higher number will look better, but creates a larger file.</td>
    </tr>
    <tr>
        <td>userAgent</td>
        <td>u</td>
        <td>The useragent used when fetching the website</td>
    </tr>
    <tr>
        <td>ignoresslerrors</td>
        <td>-</td>
        <td>Ignore ssl errors (Eg: self signed certs)</td>
    </tr>
    <tr>
        <td>nocache</td>
        <td>-</td>
        <td>Bypass the cache</td>
    </tr>
    <tr>
        <td>sendlink</td>
        <td>-</td>
        <td>Give a link to the generated image. Images requested this way are kept for 24 hours</td>
    </tr>
</table>
Parameter(s) with * are required.