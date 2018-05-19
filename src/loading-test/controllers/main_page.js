main_page = {
    key: "main_page",
    data: {
        title: "LOADING TEST",
        status_running: false,
        status_passed_job: 0,
        status_failed_job: 0,
        status_total_job: 100,
        status_percent: 0,
        status_average_spend_time: 0,

        request_job_template: {
            "url": "http://localhost/",
            "method": "get",
            "content_type" : "text/plain", //  application/json , text/html
            "data": "{}"
        },

        request_jobs: [
            {
                "url": "http://localhost/",
                "method": "get",
                "content_type" : "text/plain", //  application/json , text/html
                "data": "{}"
            },
        ],
        //config_base_url: "http://localhost/?a=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config_execute_mode: "simultaneously",

        results: [],
    },
    methods: {
        job_run: function () {
            //console.log("run");
            //console.log(vm);
            main_page_vm.results_clear();

            main_page_vm.status_running = true;

            var _url = main_page_vm.config_base_url;
            var _total_job = main_page_vm.status_total_job;
            var _completed_jobs = 0;

            for (var _i = 0; _i < _total_job; _i++) {
                var _config = {
                    "url": _url,
                    "method": "get",
                    "content_type" : "text/plain", //  application/json , text/html
                    "data": {}
                };
                main_page_vm.single_test_run(_config, function (_result) {
                    if (_result.passed === true) {
                        main_page_vm.status_passed_job++;
                    }
                    else {
                        main_page_vm.status_failed_job++;
                    }

                    main_page_vm.results.push(_result);
                    main_page_vm.status_percent = Math.floor( (main_page_vm.status_passed_job + main_page_vm.status_failed_job) / main_page_vm.status_total_job * 100 );
                    main_page_vm.stat_average_spend_time();
                    main_page_vm.update_title();

                    _completed_jobs++;
                    if (_completed_jobs === _total_job) {
                        main_page_vm.job_stop();
                    }
                });
            }
        },

        job_stop: function () {
            main_page_vm.status_running = false;
        },

        results_clear: function () {
            main_page_vm.results = [];
            main_page_vm.status_passed_job = 0;
            main_page_vm.status_failed_job = 0;
            main_page_vm.status_percent = 0;
            main_page_vm.status_average_spend_time = 0;
        },

        // ----------------------------------

        single_test_run: function (_config, _callback) {
            if (typeof(_callback) !== "function" || main_page_vm.status_running === false) {
                return;
            }

            var _start_time = null;
            var _url = _config.url;
            var _url = _config.url;

            var _ajax_callback = function (_status) {
                var _passed = (_status === 200);
                var _end_time = main_page_vm.get_current_second();
                var _spend_time = Math.floor(_end_time - _start_time) / 1000;

                var _uri = PULI_UTILS.parse_uri(_url);
                if (_uri.length < 10) {
                    _uri = _url;
                }
                else if (_uri.length > 30) {
                    _uri = _uri.substr(0, 30) + "...";
                }

                var _result = {
                    spend_time: _spend_time,
                    status: _status,
                    passed: _passed,
                    url: _url,
                    uri: _uri
                };

                if (main_page_vm.status_running === true) {
                    _callback(_result);
                }
            };

            $.ajax({
                url: _url,
                beforeSend: function () {
                    _start_time = main_page_vm.get_current_second();
                },
                success: function (_data, _textStatus, _xhr) {
                    _ajax_callback(_xhr.status);
                },
                complete: function (_xhr, _textStatus) {
                    _ajax_callback(_xhr.status);
                },
                cache: false
            });
        },

        get_current_second: function () {
            var dateTime = Date.now();
            return dateTime;
        },

        stat_average_spend_time: function () {
            var _total = 0;
            for (var _i in main_page_vm.results) {
                _total = _total + main_page_vm.results[_i].spend_time;
            }
            var _avg = Math.floor((_total / main_page_vm.results.length) * 1000) / 1000;
            main_page_vm.status_average_spend_time = _avg;
        },

        update_title: function () {
            var _title = main_page_vm.title;

            if (main_page_vm.status_percent > 0) {
                _title = main_page_vm.status_percent + "% (" + main_page_vm.status_average_spend_time + "s)";
            }

            document.title = _title;
        },

        jump_to_config: function () {
            document.getElementById('panel_configuration').scrollIntoView({
                behavior: 'smooth'
              });
        },
        
        // ---------------
        
        nav_request_config: function (_request_id) {
            //console.log("nav_request_config" + _request_id);
            request_config.data.request_id = _request_id;
            request_config.data.request_config = main_page.data.request_jobs[_request_id];
            
            this.$emit('push-page', request_config);
        },
        
        add_request_job: function (_index) {
            //console.log(_index);
            
            var _jobs = main_page.data.request_jobs;
            //var _template = main_page.data.request_job_template;
            var _template = _jobs[_index];
            _template = JSON.parse(JSON.stringify(_template));
            _jobs.splice(_index+1, 0, _template);
        },
        
        remove_request_job: function (_index) {
            //console.log(_index);
            
            var _jobs = main_page.data.request_jobs;
            if (_jobs.length < 2 || _index >= _jobs.length || _index < 0) {
                return false;
            }
            else {
                if (window.confirm("您確定要刪除嗎？")) {
                    _jobs.splice(_index, 1);
                }
            }
        },
        
        // ---------------
        
        nav_result_detail: function () {
            console.log("nav_result_detail");
        },
    }
};
