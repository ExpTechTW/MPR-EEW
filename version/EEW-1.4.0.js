'use strict'

const Plugin = {
    "name": "EEW",
    "version": "1.4.0",
    "depends": {
        "pluginLoader": ">=4.3.0",
        "UUID": ">=1.0.1"
    },
    "Events": ["messageCreate", "ready"],
    "Commands": [
        {
            "name": "EEW here",
            "note": "設定這個頻道為 EEW 推播頻道"
        }
    ],
    "author": ["whes1015"],
    "link": "https://github.com/ExpTechTW/MPR-TimeNow",
    "resources": ["AGPL-3.0"],
    "description": "顯示現在時間",
    "DHL": false
}

const config = require('../config')
const WebSocket = require('ws')
const fs = require('fs')
const path = require("path")
const Path = path.resolve("")
const pluginLoader = require('../Core/pluginLoader')
var UUID = require('./UUID')
const reload = require('require-reload')
let Client

async function ready(client) {
    if (!fs.existsSync(Path + '/Data/EEW.json')) {
        fs.writeFileSync(Path + '/Data/EEW.json', JSON.stringify({}, null, "\t"), 'utf8')
    }
    if (client != undefined) {
        Client = client
    }
}

async function messageCreate(client, message) {
    Client = client
    if (message.content == "EEW here") {
        let file = JSON.parse(fs.readFileSync(Path + '/Data/EEW.json').toString())
        file["channel"] = message.channel.id
        fs.writeFileSync(Path + '/Data/EEW.json', JSON.stringify(file, null, "\t"), 'utf8')
        await message.reply(await pluginLoader.embed("已設定這個頻道為 EEW 推播頻道"))
    }
}

async function connect() {
    var ws = new WebSocket(config.API_WebSocket);
    ws.onopen = function () {
        let Uuid = UUID.uuid()
        pluginLoader.log("Info >> EEW 已連線 UUID: " + Uuid)
        let Data = {
            "APIkey": "a5ef9cb2cf9b0c14b6ba71d0fc39e329",
            "Function": "earthquakeService",
            "Type": "subscription",
            "FormatVersion": 1,
            "UUID": Uuid
        }
        if (config.APIkey != "") {
            Data["APIkey"] = config.APIkey
        }
        ws.send(JSON.stringify(Data))
    };

    ws.onmessage = async function (e) {
        let Data = JSON.parse(e.data.toString())
        if (Data.Function == "earthquake") {
            let DATE = new Date(Number(Data.Time))
            let file = JSON.parse(fs.readFileSync(Path + '/Data/EEW.json').toString())
            let date = DATE.getFullYear() +
                "/" + (DATE.getMonth() + 1) +
                "/" + DATE.getDate() +
                " " + DATE.getHours() +
                ":" + DATE.getMinutes() +
                ":" + DATE.getSeconds()
            let level = ""
            let levelPoint = ""
            if (Number(Data.Depth) >= 300) {
                level = "深層"
                levelPoint = "🟩"
            } else if (Number(Data.Depth) >= 70) {
                level = "中層"
                levelPoint = "🟨"
            } else if (Number(Data.Depth) >= 30) {
                level = "淺層"
                levelPoint = "🟧"
            } else {
                level = "極淺層"
                levelPoint = "🟥"
            }
            let test = ""
            if (Data.Test != undefined) {
                test = "( 測試 )"
            }
            await Client.channels.cache.get(file["channel"]).send(await pluginLoader.embed(`⚠️ EEW 地震速報 ${test}\n\n${date} 左右發生顯著有感地震\n\n**東經**: ${Data.EastLongitude} **度**\n**北緯**: ${Data.NorthLatitude} **度**\n**深度**: ${Data.Depth} **公里** (${level} ${levelPoint})\n**規模**: **芮氏** ${Data.Scale}\n**最大震度**: ${Data.MaximumSeismicIntensity} **級**\n\n慎防強烈搖晃，就近避難 [趴下、掩護、穩住]`))
            if (fs.existsSync(Path + "/Plugin/PGA.js")) {
                reload(Path + "/Plugin/PGA.js").operation(Data, file["channel"], Client)
            }
        }
    }

    ws.onclose = function (e) {
        pluginLoader.log('Error >> 連線已中斷: 正在嘗試重新連線 ', e.reason)
        setTimeout(function () {
            connect()
        }, 1000)
    }

    ws.onerror = function (err) {
        pluginLoader.log('Error >> 連線錯誤: 正在嘗試重新連線 ' + err.message)
        ws.close()
        connect()
    }
}

connect()

module.exports = {
    Plugin,
    messageCreate,
    ready
}
