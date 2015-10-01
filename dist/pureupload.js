var pu;
(function (pu) {
    function castFiles(fileList, status) {
        var files;
        if (typeof fileList === 'object') {
            files = Object.keys(fileList).map(function (key) { return fileList[key]; });
        }
        else {
            files = fileList;
        }
        files.forEach(function (file) {
            file.uploadStatus = status || file.uploadStatus;
            file.responseCode = file.responseCode || 0;
            file.responseText = file.responseText || '';
            file.progress = file.progress || 0;
            file.sentBytes = file.sentBytes || 0;
            file.cancel = file.cancel || (function () { return; });
        });
        return files;
    }
    pu.castFiles = castFiles;
    function decorateSimpleFunction(origFn, newFn, newFirst) {
        if (newFirst === void 0) { newFirst = false; }
        if (!origFn)
            return newFn;
        return newFirst
            ? function () { newFn(); origFn(); }
            : function () { origFn(); newFn(); };
    }
    pu.decorateSimpleFunction = decorateSimpleFunction;
    pu.getUploadCore = function (options, callbacks) {
        return new UploadCore(options, callbacks);
    };
    pu.getUploader = function (options, callbacks) {
        return new Uploader(options, callbacks);
    };
    function newGuid() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }
    pu.newGuid = newGuid;
    ;
    var UploadArea = (function () {
        function UploadArea(targetElement, options, uploader) {
            this.targetElement = targetElement;
            this.options = options;
            this.uploader = uploader;
            this.uploadCore = pu.getUploadCore(this.options, this.uploader.queue.callbacks);
            this.setFullOptions(options);
            this.setupHiddenInput();
        }
        UploadArea.prototype.destroy = function () {
            if (this.unregisterOnClick)
                this.unregisterOnClick();
            if (this.unregisterOnDrop)
                this.unregisterOnDrop();
            if (this.unregisterOnChange)
                this.unregisterOnChange();
            if (this.unregisterOnDragOver)
                this.unregisterOnDragOver();
            this.targetElement.removeEventListener('dragover', this.onDrag);
            this.targetElement.removeEventListener('drop', this.onDrop);
            document.body.removeChild(this.fileInput);
        };
        UploadArea.prototype.setFullOptions = function (options) {
            this.options.maxFileSize = options.maxFileSize || 1024;
            this.options.allowDragDrop = options.allowDragDrop === undefined || options.allowDragDrop === null ? true : options.allowDragDrop;
            this.options.clickable = options.clickable === undefined || options.clickable === null ? true : options.clickable;
            this.options.accept = options.accept || '*.*';
            this.options.multiple = options.multiple === undefined || options.multiple === null ? true : options.multiple;
        };
        UploadArea.prototype.putFilesToQueue = function (fileList) {
            var _this = this;
            var uploadFiles = castFiles(fileList);
            uploadFiles.forEach(function (file) {
                if (_this.validateFile(file)) {
                    file.start = function () {
                        _this.uploadCore.upload([file]);
                        file.start = function () { return; };
                    };
                }
            });
            this.uploader.queue.addFiles(uploadFiles);
        };
        UploadArea.prototype.validateFile = function (file) {
            if (!this.isFileSizeValid(file)) {
                file.uploadStatus = pu.uploadStatus.failed;
                file.responseText = 'The size of this file exceeds the ' + this.options.maxFileSize + ' MB limit.';
                return false;
            }
            return true;
        };
        UploadArea.prototype.setupHiddenInput = function () {
            var _this = this;
            this.fileInput = document.createElement('input');
            this.fileInput.setAttribute('type', 'file');
            this.fileInput.setAttribute('accept', this.options.accept);
            this.fileInput.style.display = 'none';
            var onChange = function (e) { return _this.onChange(e); };
            this.fileInput.addEventListener('change', onChange);
            this.unregisterOnChange = function () { return _this.fileInput.removeEventListener('onChange', onchange); };
            if (this.options.multiple) {
                this.fileInput.setAttribute('multiple', '');
            }
            if (this.options.clickable) {
                var onClick = function () { return _this.onClick(); };
                this.targetElement.addEventListener('click', onClick);
                this.unregisterOnClick = function () { return _this.targetElement.removeEventListener('click', onClick); };
            }
            if (this.options.allowDragDrop) {
                var onDrag = function (e) { return _this.onDrag(e); };
                this.targetElement.addEventListener('dragover', onDrag);
                this.unregisterOnDragOver = function () { return _this.targetElement.removeEventListener('dragover', onDrag); };
                var onDrop = function (e) { return _this.onDrop(e); };
                this.targetElement.addEventListener('drop', onDrop);
                this.unregisterOnDrop = function () { return _this.targetElement.removeEventListener('drop', onDrop); };
            }
            // attach to body
            document.body.appendChild(this.fileInput);
        };
        UploadArea.prototype.onChange = function (e) {
            this.putFilesToQueue(e.target.files);
        };
        UploadArea.prototype.onDrag = function (e) {
            var efct;
            try {
                efct = e.dataTransfer.effectAllowed;
            }
            catch (err) {
                ;
            }
            e.dataTransfer.dropEffect = 'move' === efct || 'linkMove' === efct ? 'move' : 'copy';
            this.stopEventPropagation(e);
        };
        UploadArea.prototype.onDrop = function (e) {
            this.stopEventPropagation(e);
            if (!e.dataTransfer) {
                return;
            }
            var files = e.dataTransfer.files;
            if (files.length) {
                if (!this.options.multiple)
                    files = [files[0]];
                var result;
                var items = e.dataTransfer.items;
                if (items && items.length && (items[0].webkitGetAsEntry !== null)) {
                    if (!this.options.multiple)
                        items = [items[0]];
                    this.addFilesFromItems(items);
                }
                else {
                    this.handleFiles(files);
                }
            }
        };
        UploadArea.prototype.onClick = function () {
            this.fileInput.value = '';
            this.fileInput.click();
        };
        UploadArea.prototype.addFilesFromItems = function (items) {
            var entry;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if ((item.webkitGetAsEntry) && (entry = item.webkitGetAsEntry())) {
                    if (entry.isFile) {
                        this.putFilesToQueue([item.getAsFile()]);
                    }
                    else if (entry.isDirectory) {
                        this.processDirectory(entry, entry.name);
                    }
                }
                else if (item.getAsFile) {
                    if (!item.kind || item.kind === 'file') {
                        this.putFilesToQueue([item.getAsFile()]);
                    }
                }
            }
        };
        UploadArea.prototype.processDirectory = function (directory, path) {
            var dirReader = directory.createReader();
            var self = this;
            var entryReader = function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (entry.isFile) {
                        entry.file(function (file) {
                            if (file.name.substring(0, 1) === '.') {
                                return;
                            }
                            file.fullPath = '' + path + '/' + file.name;
                            self.putFilesToQueue([file]);
                        });
                    }
                    else if (entry.isDirectory) {
                        self.processDirectory(entry, '' + path + '/' + entry.name);
                    }
                }
            };
            dirReader.readEntries(entryReader, function (error) {
                return typeof console !== 'undefined' && console !== null
                    ? typeof console.log === 'function' ? console.log(error) : void 0
                    : void 0;
            });
        };
        UploadArea.prototype.handleFiles = function (files) {
            for (var i = 0; i < files.length; i++) {
                this.putFilesToQueue([files[i]]);
            }
        };
        UploadArea.prototype.isFileSizeValid = function (file) {
            var maxFileSize = this.options.maxFileSize * 1024 * 1024; // max file size in bytes
            if (file.size > maxFileSize)
                return false;
            return true;
        };
        UploadArea.prototype.stopEventPropagation = function (e) {
            e.stopPropagation();
            if (e.preventDefault) {
                e.preventDefault();
            }
            else {
                return e.returnValue = false;
            }
        };
        return UploadArea;
    })();
    pu.UploadArea = UploadArea;
    var UploadCore = (function () {
        function UploadCore(options, callbacks) {
            if (callbacks === void 0) { callbacks = {}; }
            this.options = options;
            this.callbacks = callbacks;
            this.setFullOptions(options);
            this.setFullCallbacks(callbacks);
        }
        UploadCore.prototype.upload = function (fileList) {
            var _this = this;
            var files = castFiles(fileList, pu.uploadStatus.uploading);
            files.forEach(function (file) { return _this.processFile(file); });
        };
        UploadCore.prototype.processFile = function (file) {
            var xhr = this.createRequest(file);
            this.setCallbacks(xhr, file);
            this.send(xhr, file);
        };
        UploadCore.prototype.createRequest = function (file) {
            var xhr = new XMLHttpRequest();
            var url = typeof this.options.url === 'function'
                ? this.options.url(file)
                : this.options.url;
            xhr.open(this.options.method, url, true);
            xhr.withCredentials = !!this.options.withCredentials;
            this.setHeaders(xhr, file.name);
            return xhr;
        };
        UploadCore.prototype.setHeaders = function (xhr, fileName) {
            var _this = this;
            if (!this.options.headers['Accept'])
                xhr.setRequestHeader('Accept', 'application/json');
            if (!this.options.headers['Cache-Control'])
                xhr.setRequestHeader('Cache-Control', 'no-cache');
            if (!this.options.headers['X-Requested-With'])
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            Object.keys(this.options.headers).forEach(function (headerName) {
                var headerValue = _this.options.headers[headerName];
                if (headerValue !== undefined && headerValue !== null)
                    xhr.setRequestHeader(headerName, headerValue);
            });
        };
        UploadCore.prototype.setCallbacks = function (xhr, file) {
            var _this = this;
            var originalCancelFn = file.cancel;
            file.cancel = decorateSimpleFunction(file.cancel, function () {
                xhr.abort();
                file.uploadStatus = pu.uploadStatus.canceled;
                _this.callbacks.onCancelledCallback(file);
                _this.callbacks.onFileStateChangedCallback(file);
                _this.callbacks.onFinishedCallback(file);
            }, true);
            xhr.onload = function (e) { return _this.onload(file, xhr); };
            xhr.onerror = function () { return _this.handleError(file, xhr); };
            xhr.upload.onprogress = function (e) { return _this.updateProgress(file, e); };
        };
        UploadCore.prototype.send = function (xhr, file) {
            var formData = this.createFormData(file);
            this.callbacks.onUploadStartedCallback(file);
            this.callbacks.onFileStateChangedCallback(file);
            xhr.send(formData);
        };
        UploadCore.prototype.createFormData = function (file) {
            var _this = this;
            var formData = new FormData();
            Object.keys(this.options.params).forEach(function (paramName) {
                var paramValue = _this.options.params[paramName];
                if (paramValue !== undefined && paramValue !== null)
                    formData.append(paramName, paramValue);
            });
            formData.append('file', file, file.name);
            return formData;
        };
        UploadCore.prototype.handleError = function (file, xhr) {
            file.uploadStatus = pu.uploadStatus.failed;
            this.setResponse(file, xhr);
            this.callbacks.onErrorCallback(file);
            this.callbacks.onFileStateChangedCallback(file);
            this.callbacks.onFinishedCallback(file);
        };
        UploadCore.prototype.updateProgress = function (file, e) {
            if (e !== null) {
                if (e.lengthComputable) {
                    file.progress = Math.round(100 * (e.loaded / e.total));
                    file.sentBytes = e.loaded;
                }
                else {
                    file.progress = 0;
                    file.sentBytes = 0;
                }
            }
            else {
                file.progress = 100;
                file.sentBytes = file.size;
            }
            this.callbacks.onProgressCallback(file);
        };
        UploadCore.prototype.onload = function (file, xhr) {
            if (xhr.readyState !== 4)
                return;
            if (file.progress !== 100)
                this.updateProgress(file);
            if (xhr.status === 200) {
                this.finished(file, xhr);
            }
            else {
                this.handleError(file, xhr);
            }
        };
        UploadCore.prototype.finished = function (file, xhr) {
            file.uploadStatus = pu.uploadStatus.uploaded;
            this.setResponse(file, xhr);
            this.callbacks.onUploadedCallback(file);
            this.callbacks.onFileStateChangedCallback(file);
            this.callbacks.onFinishedCallback(file);
        };
        ;
        UploadCore.prototype.setResponse = function (file, xhr) {
            file.responseCode = xhr.status;
            file.responseText = xhr.responseText || xhr.statusText || (xhr.status
                ? xhr.status.toString()
                : '' || 'Invalid response from server');
        };
        UploadCore.prototype.setFullOptions = function (options) {
            this.options.url = options.url;
            this.options.method = options.method;
            this.options.headers = options.headers || {};
            this.options.params = options.params || {};
            this.options.withCredentials = options.withCredentials || false;
        };
        UploadCore.prototype.setFullCallbacks = function (callbacks) {
            this.callbacks.onProgressCallback = callbacks.onProgressCallback || (function () { return; });
            this.callbacks.onCancelledCallback = callbacks.onCancelledCallback || (function () { return; });
            this.callbacks.onFinishedCallback = callbacks.onFinishedCallback || (function () { return; });
            this.callbacks.onUploadedCallback = callbacks.onUploadedCallback || (function () { return; });
            this.callbacks.onErrorCallback = callbacks.onErrorCallback || (function () { return; });
            this.callbacks.onUploadStartedCallback = callbacks.onUploadStartedCallback || (function () { return; });
            this.callbacks.onFileStateChangedCallback = callbacks.onFileStateChangedCallback || (function () { return; });
        };
        return UploadCore;
    })();
    pu.UploadCore = UploadCore;
    var Uploader = (function () {
        function Uploader(options, callbacks) {
            if (options === void 0) { options = {}; }
            if (callbacks === void 0) { callbacks = {}; }
            this.setOptions(options);
            this.uploadAreas = [];
            this.queue = new UploadQueue(options, callbacks);
        }
        Uploader.prototype.setOptions = function (options) {
            this.options = options;
        };
        Uploader.prototype.registerArea = function (element, options) {
            var uploadArea = new UploadArea(element, options, this);
            this.uploadAreas.push(uploadArea);
            return uploadArea;
        };
        Uploader.prototype.unregisterArea = function (area) {
            var areaIndex = this.uploadAreas.indexOf(area);
            if (areaIndex >= 0) {
                this.uploadAreas[areaIndex].destroy();
                this.uploadAreas.splice(areaIndex, 1);
            }
        };
        return Uploader;
    })();
    pu.Uploader = Uploader;
    var UploadQueue = (function () {
        function UploadQueue(options, callbacks) {
            this.queuedFiles = [];
            this.options = options;
            this.callbacks = callbacks;
            this.setFullOptions();
            this.setFullCallbacks();
        }
        UploadQueue.prototype.addFiles = function (files) {
            var _this = this;
            files.forEach(function (file) {
                _this.queuedFiles.push(file);
                file.guid = newGuid();
                file.remove = decorateSimpleFunction(file.remove, function () {
                    _this.removeFile(file);
                });
                _this.callbacks.onFileAddedCallback(file);
                if (file.uploadStatus === pu.uploadStatus.failed) {
                    if (_this.callbacks.onErrorCallback) {
                        _this.callbacks.onErrorCallback(file);
                    }
                }
                else {
                    file.uploadStatus = pu.uploadStatus.queued;
                }
            });
            this.filesChanged();
        };
        UploadQueue.prototype.removeFile = function (file, blockRecursive) {
            if (blockRecursive === void 0) { blockRecursive = false; }
            var index = this.queuedFiles.indexOf(file);
            if (index < 0)
                return;
            this.deactivateFile(file);
            this.queuedFiles.splice(index, 1);
            this.callbacks.onFileRemovedCallback(file);
            if (!blockRecursive)
                this.filesChanged();
        };
        UploadQueue.prototype.clearFiles = function (excludeStatuses, cancelProcessing) {
            var _this = this;
            if (excludeStatuses === void 0) { excludeStatuses = []; }
            if (cancelProcessing === void 0) { cancelProcessing = false; }
            if (!cancelProcessing)
                excludeStatuses = excludeStatuses.concat([pu.uploadStatus.queued, pu.uploadStatus.uploading]);
            this.queuedFiles.filter(function (file) { return excludeStatuses.indexOf(file.uploadStatus) < 0; })
                .forEach(function (file) { return _this.removeFile(file, true); });
            this.callbacks.onQueueChangedCallback(this.queuedFiles);
        };
        UploadQueue.prototype.filesChanged = function () {
            if (this.options.autoRemove)
                this.removeFinishedFiles();
            if (this.options.autoStart)
                this.startWaitingFiles();
            this.callbacks.onQueueChangedCallback(this.queuedFiles);
            this.checkAllFinished();
        };
        UploadQueue.prototype.checkAllFinished = function () {
            var unfinishedFiles = this.queuedFiles
                .filter(function (file) { return [pu.uploadStatus.queued, pu.uploadStatus.uploading]
                .indexOf(file.uploadStatus) >= 0; });
            if (unfinishedFiles.length === 0) {
                this.callbacks.onAllFinishedCallback();
            }
        };
        UploadQueue.prototype.setFullOptions = function () {
            this.options.maxParallelUploads = this.options.maxParallelUploads || 0;
            this.options.autoStart = this.options.autoStart || false;
            this.options.autoRemove = this.options.autoRemove || false;
        };
        UploadQueue.prototype.setFullCallbacks = function () {
            var _this = this;
            this.callbacks.onFileAddedCallback = this.callbacks.onFileAddedCallback || (function () { return; });
            this.callbacks.onFileRemovedCallback = this.callbacks.onFileRemovedCallback || (function () { return; });
            this.callbacks.onAllFinishedCallback = this.callbacks.onAllFinishedCallback || (function () { return; });
            this.callbacks.onQueueChangedCallback = this.callbacks.onQueueChangedCallback || (function () { return; });
            this.callbacks.onFileStateChangedCallback = function () { return _this.filesChanged(); };
        };
        UploadQueue.prototype.startWaitingFiles = function () {
            var files = this.getWaitingFiles().forEach(function (file) { return file.start(); });
        };
        UploadQueue.prototype.removeFinishedFiles = function () {
            var _this = this;
            this.queuedFiles
                .filter(function (file) { return [
                pu.uploadStatus.uploaded,
                pu.uploadStatus.canceled
            ].indexOf(file.uploadStatus) >= 0; })
                .forEach(function (file) { return _this.removeFile(file, true); });
        };
        UploadQueue.prototype.deactivateFile = function (file) {
            if (file.uploadStatus === pu.uploadStatus.uploading)
                file.cancel();
            file.uploadStatus = pu.uploadStatus.removed;
            file.cancel = function () { return; };
            file.remove = function () { return; };
            file.start = function () { return; };
        };
        UploadQueue.prototype.getWaitingFiles = function () {
            if (!this.options.autoStart)
                return [];
            var result = this.queuedFiles
                .filter(function (file) { return file.uploadStatus === pu.uploadStatus.queued; });
            if (this.options.maxParallelUploads > 0) {
                var uploadingFilesCount = this.queuedFiles
                    .filter(function (file) { return file.uploadStatus === pu.uploadStatus.uploading; })
                    .length;
                var count = this.options.maxParallelUploads - uploadingFilesCount;
                if (count <= 0) {
                    return [];
                }
                result = result.slice(0, count);
            }
            return result;
        };
        return UploadQueue;
    })();
    pu.UploadQueue = UploadQueue;
    var UploadStatusStatic = (function () {
        function UploadStatusStatic() {
        }
        UploadStatusStatic.queued = 'queued';
        UploadStatusStatic.uploading = 'uploading';
        UploadStatusStatic.uploaded = 'uploaded';
        UploadStatusStatic.failed = 'failed';
        UploadStatusStatic.canceled = 'canceled';
        UploadStatusStatic.removed = 'removed';
        return UploadStatusStatic;
    })();
    pu.UploadStatusStatic = UploadStatusStatic;
    pu.uploadStatus = UploadStatusStatic;
})(pu || (pu = {}));
