#!/usr/bin/env python3
""" After converting the .po file to json format, merge it with another .json file """

import sys
import json
import optparse
import polib

parser = optparse.OptionParser("usage: %prog --po <po file> --json <json file> --output <new json file>")

parser.add_option("--po",
                  type="string",
                  default="",
                  dest="pofile",
                  help="input po file")

parser.add_option("--json",
                  type="string",
                  default="",
                  dest="jsonfile",
                  help="input json file")

parser.add_option("--output",
                  type="string",
                  default="",
                  dest="destfile",
                  help="output new json file")

(options, args) = parser.parse_args()


# 檢查參數 --po
if options.pofile == "":
    print("Error: missing --po")

# 檢查 --po 檔案是否存在
try:
    with open(options.pofile, "r") as f:
        pass # do nothing
except FileNotFoundError:
    print("Error: file not found --po")
    sys.exit(1)

# 檢查參數 --json
if options.jsonfile == "":
    print("Error: missing --json")
# 檢查 --json 檔案是否存在
try:
    with open(options.jsonfile, "r") as f:
        pass # do nothing
except FileNotFoundError:
    print("Error: file not found --json")
    sys.exit(1)

# 檢查參數 --output
if options.destfile == "":
    print("Error: missing --output")

# 如果有錯誤，顯示使用說明，然後結束
if options.pofile == "" or options.jsonfile == "" or options.destfile == "":
    parser.print_help()
    sys.exit(1)

# 讀取 po 檔案，並轉換成 json 格式
xlate_map = {}
po = polib.pofile(options.pofile,
                  autodetect_encoding=False,
                  encoding="utf-8",
                  wrapwidth=-1)

for entry in po.translated_entries():
    if entry.msgstr == '':
        continue

    xlate_map[entry.msgid] = entry.msgstr

# 讀取 json 檔案
with open(options.jsonfile, "r") as f:
    json_data = json.load(f)

# 合併 po 與 json 檔案
for key in xlate_map:
    json_data[key] = xlate_map[key]

# 寫入新的 json 檔案
with open(options.destfile, "w") as f:
    json.dump(json_data, f, ensure_ascii=False)
