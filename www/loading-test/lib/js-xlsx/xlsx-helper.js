
var xlsx_helper_download = function (type, filename, data) {
    //console.log(filename);
    //var elt = document.getElementById('data-table');
    //var wb = XLSX.utils.table_to_book(elt, {sheet: "Sheet JS"});

    var wb = XLSX.utils.book_new();
    if (Array.isArray(data)) {
        var ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "data");
    } else {
        for (var _sheet_name in data) {
            var _sheet_data = data[_sheet_name];
            if (Array.isArray(_sheet_data) === false) {
                var _tmp = [];
                for (var _field_name in _sheet_data) {
                    var _field_value = _sheet_data[_field_name];
                    _tmp.push({
                        'key': _field_name,
                        'value': _field_value
                    });
                }
                _sheet_data = _tmp;
            }

            var ws = XLSX.utils.json_to_sheet(_sheet_data);
            XLSX.utils.book_append_sheet(wb, ws, _sheet_name);
        }
    }

    // --------------------------------------

    if (filename.substr(filename.length - type.length - 1, type.length + 1) !== "." + type) {
        filename = filename + "." + type;
    }

    //XLSX.write(wb, {bookType: type, bookSST: true, type: 'base64'})
    if (typeof (ELECTRON_ENABLE) === 'undefined' || ELECTRON_ENABLE === false) {
        XLSX.writeFile(wb, filename || ('test.' + (type || 'xlsx')));
    } else {
        var _filters = [
            {
                name: "Open Document Spreadsheet",
                extensions: ["ods"]
            }
        ];
        ipcRenderer.send('save_file', filename, JSON.stringify(_filters), XLSX.write(wb, {bookType: type, bookSST: true, type: 'base64'}));
    }
};


var process_wb = (function () {
    var to_json = function to_json(workbook) {
        var result = {};
        workbook.SheetNames.forEach(function (sheetName) {
            var roa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1});
            if (roa.length)
                result[sheetName] = roa;
        });
        //return JSON.stringify(result, 2, 2);
        var _result = {};
        for (var _sheet_name in result) {
            var _sheet_data = result[_sheet_name];

            var _data;
            //console.log(_sheet_name);
            if (_sheet_data[0][0] === 'key' && _sheet_data[0][1] === 'value' && _sheet_data[0].length === 2) {
                // key-value模式
                //console.log("key-value模式");
                _data = {};
                for (var _i = 1; _i < _sheet_data.length; _i++) {
                    var _row = _sheet_data[_i];
                    _data[_row[0]] = _row[1];
                }
            } else {
                // 陣列模式
                //console.log("陣列模式");
                _data = [];
                var _key_dict = _sheet_data[0];
                for (var _i = 1; _i < _sheet_data.length; _i++) {
                    var _row = _sheet_data[_i];
                    var _d = {};
                    for (var _j = 0; _j < _row.length; _j++) {
                        var _key = _key_dict[_j];
                        _d[_key] = _row[_j];
                    }
                    _data.push(_d);
                }
            }
            _result[_sheet_name] = _data;
        }

        return _result;
    };

    return function process_wb(wb, _callback) {
        global_wb = wb;
        var output = "";
        output = to_json(wb);
        //console.log(output);

        _callback(output);
    };
})();

var XW = {
    /* worker message */
    msg: 'xlsx',
    /* worker scripts */
    worker: './lib/js-xlsx/xlsxworker.js'
};

var do_file = (function () {
    var rABS = true;
    var use_worker = true;
    var xw = function xw(data, cb, _callback) {
        var worker = new Worker(XW.worker);
        worker.onmessage = function (e) {
            switch (e.data.t) {
                case 'ready':
                    break;
                case 'e':
                    console.error(e.data.d);
                    break;
                case XW.msg:
                    cb(JSON.parse(e.data.d), _callback);
                    break;
            }
        };
        worker.postMessage({d: data, b: rABS ? 'binary' : 'array'});
    };

    return function do_file(files, _callback) {
        var rABS = true;
        var use_worker = true;
        var f = files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            if (typeof console !== 'undefined') {
                //console.log("onload", new Date(), rABS, use_worker);
            }
            var data = e.target.result;
            if (!rABS)
                data = new Uint8Array(data);
            if (use_worker)
                xw(data, process_wb, _callback);
            else {
                //console.log(typeof(_callback));
                process_wb(XLSX.read(data, {type: rABS ? 'binary' : 'array'}), _callback);
            }
            ;
        };
        if (rABS)
            reader.readAsBinaryString(f);
        else
            reader.readAsArrayBuffer(f);
    };
})();

var xlsx_helper_open = function (_callback) {
    $("#xlsx_helper_open_file").remove();
    var _input = $('<input type="file" name="xlfile" id="xlsx_helper_open_file" />').hide().appendTo('body');
    _input.change(function (e) {
        do_file(e.target.files, _callback);
    });
    _input.click();
};

var xlsx_helper_open_url = function (_url, _callback) {
    var rABS = false;
    var xw = function xw(data, cb, _callback_xw) {
        var worker = new Worker(XW.worker);
        worker.onmessage = function (e) {
            switch (e.data.t) {
                case 'ready':
                    break;
                case 'e':
                    console.error(e.data.d);
                    break;
                case XW.msg:
                    cb(JSON.parse(e.data.d), _callback_xw);
                    break;
            }
        };
        worker.postMessage({d: data, b: rABS ? 'binary' : 'array'});
    };
    $.ajax({
        url: _url,
        type: "GET",
        dataType: "binary",
        responseType: 'arraybuffer',
        processData: true,
        success: function (result) {
            //console.log(result);
            xw(result, process_wb, _callback);
        }
    });
};

/**
 * use this transport for "binary" data type
 * @author http://www.henryalgus.com/reading-binary-files-using-jquery-ajax/
 */
$.ajaxTransport("+binary", function(options, originalOptions, jqXHR){
    // check for conditions and support for blob / arraybuffer response type
    if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob)))))
    {
        return {
            // create new XMLHttpRequest
            send: function(headers, callback){
		// setup all variables
                var xhr = new XMLHttpRequest(),
		url = options.url,
		type = options.type,
		async = options.async || true,
		// blob or arraybuffer. Default is blob
		dataType = options.responseType || "blob",
		data = options.data || null,
		username = options.username || null,
		password = options.password || null;
					
                xhr.addEventListener('load', function(){
			var data = {};
			data[options.dataType] = xhr.response;
			// make callback and send data
			callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                });
 
                xhr.open(type, url, async, username, password);
				
		// setup custom headers
		for (var i in headers ) {
			xhr.setRequestHeader(i, headers[i] );
		}
				
                xhr.responseType = dataType;
                xhr.send(data);
            },
            abort: function(){
                jqXHR.abort();
            }
        };
    }
});