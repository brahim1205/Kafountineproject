#!/usr/bin/env bash
# Compare les envois d'images et le décodage des corps, hors harnais JSON.
source "$(dirname "$0")/env.sh"; cd "$DATA"; printf '\x89PNG\r\n\x1a\nxxxx' > img.png; head -c 6000000 /dev/zero > big.bin
norm() { sed -E 's/"requestId":"[^"]*"//; s/upload-[0-9a-f-]{36}/upload-X/g'; }
for p in 3000 3002; do
  O="-H origin:\ http://127.0.0.1:5173"
  T=$(curl -s -c - -o /dev/null -H 'origin: http://127.0.0.1:5173' -H 'content-type: application/json' -d '{"email":"agent@kafountine.gouv.sn","password":"TestPassword123!"}' http://127.0.0.1:$p/api/v1/auth/login | awk '/auth_token/{print $7}')
  A="authorization: Bearer $T"; G='origin: http://127.0.0.1:5173'; U=http://127.0.0.1:$p
  { for f in "image=@img.png;type=image/png" "image=@img.png;type=image/gif" "other=@img.png;type=image/png" "image=@big.bin;type=image/png" "image=@img.png;type=image/jpeg"; do
      curl -s -w ' [%{http_code}]\n' -H "$G" -H "$A" -F "$f" $U/api/v1/upload/image; done
    curl -s -w ' [%{http_code}]\n' -H "$G" -H "$A" -F 'image=@img.png;type=image/png' -F 'image=@img.png;type=image/png' $U/api/v1/upload/image
    curl -s -w ' [%{http_code}]\n' -H "$G" -H "$A" -X POST $U/api/v1/upload/image
    curl -s -w ' [%{http_code}]\n' -H "$G" -X POST $U/api/v1/upload/image
    ID=$(curl -s -H "$G" -H "$A" -F 'image=@img.png;type=image/png' $U/api/v1/upload/image | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"]["publicId"])')
    NAME=$ID.png
    curl -s -D - -o body.$p $U/uploads/$NAME | grep -iE '^(content-type|cache-control|x-content-type)' | tr -d '\r'| tr 'A-Z' 'a-z'; cmp body.$p img.png && echo same
    curl -s -w ' [%{http_code}]\n' $U/uploads/nope.png
    curl -s -w ' [%{http_code}]\n' -H "$G" -H "$A" -X DELETE $U/api/v1/upload/image/$ID
    curl -s -w ' [%{http_code}]\n' -H "$G" -H "$A" -X DELETE $U/api/v1/upload/image/$ID
    curl -s -w ' [%{http_code}]\n' -X POST -H "$G" -H 'content-type: application/json' --data '{bad' $U/api/v1/auth/logout
    curl -s -w ' [%{http_code}]\n' -X POST -H "$G" -H 'content-type: application/json' --data '5' $U/api/v1/auth/forgot-password
    curl -s -w ' [%{http_code}]\n' -X POST -H "$G" -H 'content-type: text/plain' --data 'x' $U/api/v1/auth/forgot-password
    curl -s -w ' [%{http_code}]\n' -X POST -H "$G" --data-urlencode 'email=a@b.sn' $U/api/v1/auth/forgot-password
    curl -s -w ' [%{http_code}]\n' -X POST -H "$G" -H 'content-type: application/json' $U/api/v1/auth/forgot-password
  } | norm > out.$p
done
diff out.3000 out.3002 && echo "médias et corps identiques ($(wc -l < out.3000) contrôles)"
