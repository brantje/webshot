#Webshot
Small nodejs server for taking screenshots from a webpage.

Usage:
http://webshot.local:8080?url=[url]

Replace url with the actual url you want to take a screenshot from.

##Parameters
<table>
    <tr>
        <td>Parameter</td>
        <td>Description</td>
    </tr>
    <tr>
        <td>url*</td>
        <td>URL from the website to take the website from</td>
    </tr>
    <tr>
        <td>height</td>
        <td>Height of the screen resolution (Default: 1080)</td>
    </tr>
    <tr>
        <td>width</td>
        <td>Width of the screen resolution (Default: 1920)</td>
    </tr>
    <tr>
        <td>filetype</td>
        <td>Default png. Other options: jpg, jpeg</td>
    </tr>
    <tr>
        <td>quality</td>
        <td>JPEG compression quality. A higher number will look better, but creates a larger file.</td>
    </tr>
    <tr>
        <td>userAgent</td>
        <td>The useragent used when fetching the website</td>
    </tr>
    <tr>
        <td>ignoresslerrors</td>
        <td>Ignore ssl errors (Eg: self signed certs)</td>
    </tr>
    <tr>
        <td>nocache</td>
        <td>-</td>
        <td>Bypass the cache</td>
    </tr>
    <tr>
        <td>sendlink</td>
        <td>
            Give a link to the generated image. Images requested this way are kept for 24 hours.   
            Example: `http://webshot.local/?url=http://google.com&sendlink=true`
        </td>
    </tr>
    <tr>
        <td>filetype</td>
        <td>Used file type. Default: `png`. Other option(s): 'pdf`</td>
    </tr>
</table>
Parameter(s) with * are required.

#Rendering html strings
Do a post with a `html_string` key.
You can use the parameters above.