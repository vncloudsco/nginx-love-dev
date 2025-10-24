Chỉnh sửa lại phần View and analyze nginx access and error logs trong phần log nếu log bị dài quá trong modsec thì hệ thống cắt log hiển thị không đủ như sau:

            "message": "*21742 [client 52.186.182.85] ModSecurity: Access denied with code 403 (phase 2). Matched \"Operator `Ge' with parameter `5' against variable `TX:BLOCKING_INBOUND_ANOMALY_SCORE' (Value: `5' ) [file \"/e",

trong khi log đầy đủ như bên dưới:



ModSecurity: Warning. detected SQLi using libinjection. [file "/etc/nginx/modsec/coreruleset/rules/REQUEST-942-APPLICATION-ATTACK-SQLI.conf"] [line "46"] [id "942100"] [rev ""] [msg "SQL Injection Attack Detected via libinjection"] [data "Matched Data: sos found within ARGS:mdc: for pid in /proc/[0-9]*; do case $(ls -l $pid/exe) in *'(deleted)'*|*'/.'*) kill -9 ${pid##*/} ;; esac; done; while read -r line; do case $line in *\x22/proc/\x22*)  (185 characters omitted)"] [severity "2"] [ver "OWASP_CRS/4.20.0-dev"] [maturity "0"] [accuracy "0"] [tag "application-multi"] [tag "language-multi"] [tag "platform-multi"] [tag "attack-sqli"] [tag "paranoia-level/1"] [tag "OWASP_CRS"] [tag "OWASP_CRS/ATTACK-SQLI"] [tag "capec/1000/152/248/66"] [hostname "10.0.0.203"] [uri "/device.rsp"] [unique_id "176094161071.529267"] [ref "v65,344"]


ModSecurity: Warning. Matched "Operator `Rx' with parameter `(?i)(?:::(/\*.*?\*/)?jsonb?)?(?:(?:@|->?)>|<@|\?[&\|]|#>>?|[<>]|<-)|(?:(?:@|->?)>|<@|\?[&\|]|#>>?|[<>]|<-)?[\"'`][\[\{][^#\]\}]*[\]\}]+[\"'`]|\bjson_extract\b[^\(]*\([^\)]*\)' against variable `ARGS:mdc' (Value: `for pid in /proc/[0-9]*; do case $(ls -l $pid/exe) in *'(deleted)'*|*'/.'*) kill -9 ${pid##*/} ;; es (244 characters omitted)' ) [file "/etc/nginx/modsec/coreruleset/rules/REQUEST-942-APPLICATION-ATTACK-SQLI.conf"] [line "609"] [id "942550"] [rev ""] [msg "JSON-Based SQL Injection"] [data "Matched Data: < found within ARGS:mdc: forpidin/proc/[0-9]*;docase$(ls-l$pid/exe)in*'(deleted)'*|*'/.'*)kill-9${pid##*/};;esac;done;whileread-rline;docase$linein*\x22/proc/\x22*)pid=${line##*/proc/};kill-9$ (139 characters omitted)"] [severity "2"] [ver "OWASP_CRS/4.20.0-dev"] [maturity "0"] [accuracy "0"] [tag "application-multi"] [tag "language-multi"] [tag "platform-multi"] [tag "attack-sqli"] [tag "paranoia-level/1"] [tag "OWASP_CRS"] [tag "OWASP_CRS/ATTACK-SQLI"] [tag "capec/1000/152/248/66"] [hostname "10.0.0.203"] [uri "/device.rsp"] [unique_id "176094161071.529267"] [ref "o181,1v65,344t:urlDecodeUni,t:removeWhitespace"]
ModSecurity: Access denied with code 403 (phase 2). Matched "Operator `Ge' with parameter `5' against variable `TX:BLOCKING_INBOUND_ANOMALY_SCORE' (Value: `45' ) [file "/etc/nginx/modsec/coreruleset/rules/REQUEST-949-BLOCKING-EVALUATION.conf"] [line "222"] [id "949110"] [rev ""] [msg "Inbound Anomaly Score Exceeded (Total Score: 45)"] [data ""] [severity "0"] [ver "OWASP_CRS/4.20.0-dev"] [maturity "0"] [accuracy "0"] [tag "anomaly-evaluation"] [tag "OWASP_CRS"] [hostname "10.0.0.203"] [uri "/device.rsp"] [unique_id "176094161071.529267"] [ref ""]


Bây giờ tôi cần phần Details log hiển thị thêm các thông tin:
- Rule ID: là trường id trong log đầy đủ
- Message: là trường msg trong log đầy đủ
- Severity: là trường severity trong log đầy đủ
- tag: là trường tag trong log đầy đủ, nếu có nhiều tag thì hiển thị tất cả các tag, ngăn cách nhau bởi dấu phẩy
- Phần Message không bị cắt nữa