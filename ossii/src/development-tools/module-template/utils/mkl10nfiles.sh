#!/bin/bash

# 此腳本用於產生模組的localizations.json 檔案。
# 它將在模組的 l10n 目錄中產生該檔案。

# 該腳本將查找模組的 po 目錄中的所有 .po 檔案。
# 並將 po 檔案轉換為 {語言}.json 存入 l10n 目錄下.
# 然後在 localizations.json 增加 " 語言": "json檔名"

# Get the path to the module's l10n directory
l10n_dir="./l10n"

echo "{" > "$l10n_dir/localizations.json"

# Loop through all .po files in the po directory
for po_file in po/*.po; do
    # Get the language code from the po file name
    language=$(basename "$po_file" .po)
    # replace the _ with - in the language code
    iso_language=${language//_/-}

    # Convert the po file to json and save it in the l10n directory
    json_file="$l10n_dir/$language.json"
    ./utils/po2json.py "$po_file" -o "$l10n_dir/$language.json"

    # Add the language and json file name to localizations.json
    echo "\"$iso_language\": \"$language.json\"," >> "$l10n_dir/localizations.json"

    # 如果 iso_language 是 zh-TW 再增加一筆 zh-tw 和 zh-Hant
    if [ "$iso_language" == "zh-TW" ]; then
        echo "\"zh-tw\": \"$language.json\"," >> "$l10n_dir/localizations.json"
        echo "\"zh-Hant\": \"$language.json\"," >> "$l10n_dir/localizations.json"
    fi
    # 如果 iso_language 是 zh-CN 再增加一筆 zh-cn 和 zh-Hans
    if [ "$iso_language" == "zh-CN" ]; then
        echo "\"zh-cn\": \"$language.json\"," >> "$l10n_dir/localizations.json"
        echo "\"zh-Hans\": \"$language.json\"," >> "$l10n_dir/localizations.json"
    fi
done

# 預設 en: false
echo "\"en\": false" >> "$l10n_dir/localizations.json"

echo "}" >> "$l10n_dir/localizations.json"
