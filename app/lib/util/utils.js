class Util {
    static spawnWorker(fun) {
        const dataObj = '(' + fun + ')();';
        const blob = new Blob([dataObj.replace('"use strict";', '')]);

        const blobURL = (self.URL ? self.URL : self.webkitURL).createObjectURL(blob, {
            type: 'application/javascript; charset=utf-8'
        });

        return new Worker(blobURL);
    }

}