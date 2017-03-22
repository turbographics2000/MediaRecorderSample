function parseMKV(data) {
    var maxIDLength = 4;
    var maxSizeLength = 8;
    var decoder = new TextDecoder();
    var masterTypeElements = {};
    var result = {};
    var resultNameClassify = {};
    var reader = new DataView(data.buffer || data);
    var offset = 0;
    var getUint8 = function() {
        var val = reader.getUint8(offset);
        offset++;
        return val;
    }
    var getFloat32 = function() {
        var val = reader.getFloat32(offset);
        offset += 4;
        return val;
    }
    var getFloat64 = function() {
        var val = reader.getFloat64(offset);
        offset += 8;
        return val;
    }

    var parseVariableLengthData = function (reader, maxLength) {
        var firstByte = getUint8();
        if (!(firstByte >> (8 - maxLength))) throw 'length error';
        var b = 0x80;
        var data = firstByte;
        var i = 0;
        for (; !(firstByte & b); b >>= 1) i++;
        if (maxLength === 8) data = data & (b - 1);
        for (; i > 0; i--) data = data * 0x100 + getUint8();
        //console.log('VINT', data.toString(16).toUpperCase());
        return data;
    };

    while(true) {
        var elementId = parseVariableLengthData(reader, maxIDLength).toString(16).toUpperCase();
        if(matroskaElementDictionary[elementId]) {
            var elmInfo = matroskaElementDictionary[elementId];
            if(!elmInfo) throw 'unknown element';

            var dataSize = parseVariableLengthData(reader, maxSizeLength);
            var elmData = {
                idName: elmInfo.name,
                level: elmInfo.level,
                id: elementId.toString(16).toUpperCase(),
                dataSize: dataSize
            };
            if(elmInfo.dataType === 'master') {
                masterTypeElements[elmInfo.level] = elmData;
            } else {
                //elmData.binaryData = new Uint8Array(reader.buffer, offset, dataSize);
                var binaryData = new Uint8Array(reader.buffer, offset, dataSize);
                offset += dataSize;
                if(elmInfo.dataType === 'string' || elmInfo.dataType === 'utf-8') {
                    //elmData.value = decoder.decode(elmData.binaryData);
                    elmData.value = decoder.decode(binaryData);
                } else if(elmInfo.dataType === 'uint' || elmInfo.dataType === 'int') {
                    if(dataSize) {
                        for(var i = 0; i < dataSize; i++) elmData.value = (elmData.value || 0) * 0x10 + binaryData[i]; 
                    } else {
                        elmData.value = elmInfo.default || 0;
                    }
                } else if(elmInfo.dataType === 'float') {
                    offset -= dataSize;
                    if(dataSize === 4) {
                        elmData.value = getFloat32();
                    } else if(dataSize === 8) {
                        elmData.value = getFloat64();
                    } else {
                        throw 'float size error';
                    }
                } else {
                    //elmData.value = binaryData;
                }
                if(elmInfo.name === 'TrackType') elmData.trackType = { '1': 'video', '2': 'audio', '3': 'complex', '10': 'logo', '11': 'subtitle', '12': 'buttons', '20': 'control'}[elmData.value.toString(16)];
                if(elmInfo.name === 'EBMLMaxIDLength') maxIDLength = elmData.value;
                if(elmInfo.name === 'EBMLMaxSizeLength') maxSizeLength = elmData.value;
                //console.log('name', elmInfo.name, 'dataType', elmInfo.dataType, 'dataSize', dataSize +'(' + dataSize.toString(16).toUpperCase() +')', 'binaryData', elmData.binaryData, 'value', elmData.value);
            }
            if(elmInfo.level === '0' || elmInfo.level === 'g') {
                result[elementId] = elmData;
            } else {
                var parent = masterTypeElements['' + (+elmInfo.level - 1)];
                if(parent) {
                    parent.children = parent.children || {};
                    parent.children[elementId] = parent.children[elementId] || [];
                    parent.children[elementId].push(elmData);
                }else {
                    result[elementId] = elmData;
                }
            }
            resultNameClassify[elmInfo.name] = resultNameClassify[elmInfo.name] || [];
            resultNameClassify[elmInfo.name].push(elmData);
            //console.log('currentOffset', offset + '(' + offset.toString(16).toUpperCase() + ')');
            if(offset >= reader.byteLength || offset >= reader.byteLength - 1) break;
        } else {
            throw 'parse error';
        }
    }
    return [result, resultNameClassify];
}
