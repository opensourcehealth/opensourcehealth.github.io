//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gAbstractID = null
var gBackupNumberOfUpdates = -1
var gBracketTable = {
	'&lt;':'<',
	'&gt;':'>'}
var gBracketExpression = new RegExp(Object.keys(gBracketTable).join("|"), "gi")
var gCurrentKey = null
var gDate = null
var gEscapeTable = {
	'%09':'\t',
	'%0A':'\n',
	'%0D':'\r',
	'%20':' ',
	'%24':'$',
	'%26':'&',
	'%60':'`',
	'%3A':':',
	'%3C':'<',
	'%3E':'>',
	'%5B':'[',
	'%5D':']',
	'%7B':'{',
	'%7D':'}',
	'%22':'"',
	'%2B':'+',
	'%23':'#',
	'%25':'%',
	'%40':'@',
	'%2F':'/',
	'%3B':';',
	'%3D':'=',
	'%3F':'?',
	'%5C':'\\',
	'%5E':'^',
	'%7C':'|',
	'%7E':'~',
	'%27':'\'',
	'%2C':','}
var gEscapeExpression = new RegExp(Object.keys(gEscapeTable).join("|"), "gi")
const gLZStringHeader = 'lz_'
var gProject = null
var gRedoMap = null
var gTitle = null
var gUndoMap = null
var gWordString = null
//var gURLMaximumLength = 1900

function browse(input) {
	var fileReader = new FileReader()
	fileReader.onload = function() {
		console.log('fileReader.result')
		console.log(fileReader.result)
		document.getElementById('wordAreaID').value = fileReader.result
		update()
	}
	fileReader.readAsText(input.files[0])
}

function getBracketReplacedLinesByText(wordString) {
	return wordString.split(getEndOfLine(wordString))
}

function getCompressToEncodedURI(text) {
//	if (text.length < gURLMaximumLength) {
		return text.replace(/\n/g, '%0A').replace(/,/g, '%2C').replace(/\t/g, '%09')
//	}
/*
	var compressedText = gLZStringHeader + LZString.compressToEncodedURIComponent(text)
	if (compressedText.length < gURLMaximumLength) {
		return compressedText
	}
	var text = 'abstract'
	if (gProject != null) {
		text += ' project=' + gProject
	}
	if (gAbstractID != null) {
		text += ' part=' + gAbstractID
	}
	if (gDate != null) {
		text += ' date=' + gDate
	}
	text += ' note=The text is too long to fit into a url.'
	return text + ' So click on Load Last Session in the File menu to recover the text.'
*/
}

function getDecompressFromEncodedURI(text) {
	if (text.indexOf('=') == -1) {
		return LZString.decompressFromEncodedURIComponent(text.slice(text.lastIndexOf('_') + 1))
	}
	return text
}

function getMapByString(text) {
	if (getIsEmpty(text)) {
		return new Map()
	}
	var entryStrings = text.split('\n')
	var entryStringListsLength = entryStrings.length / 2
	var entryStringLists = new Array(entryStringListsLength)
	for (var entryIndex = 0; entryIndex < entryStringListsLength; entryIndex++) {
		var stringIndex = entryIndex + entryIndex
		entryStringLists[entryIndex] = [entryStrings[stringIndex], entryStrings[stringIndex + 1]]
	}
	return new Map(entryStringLists)
}

function getSessionBoolean(booleanKey) {
	if (sessionStorage.getItem(booleanKey) == null) {
		return false
	}
	return true
}

function getStringByMap(map) {
	var mapStrings = new Array(map.size + map.size)
	var mapStringIndex = 0
	for (var entry of map.entries()) {
		mapStrings[mapStringIndex] = entry[0]
		mapStrings[mapStringIndex + 1] = entry[1]
		mapStringIndex += 2
	}
	return mapStrings.join('\n')
}

function getWordStringUpdateStorage() {
	var wordString = sessionStorage.getItem(gCurrentKey)
	if (wordString == null) {
		return null
	}
	if (!getIsEmpty(gTitle)) {
		localStorage.setItem(gTitle, wordString)
	}
	sessionStorage.setItem('oldQueryKeyKey@', gCurrentKey)
	document.getElementById('wordAreaID').value = wordString
	return wordString
}

function loadASessionChanged() {
	var loadASessionSelect = document.getElementById('loadASessionID')
	document.getElementById('wordAreaID').value = localStorage.getItem(loadASessionSelect.options[loadASessionSelect.selectedIndex].text)
	update()
}

function loadLastSession() {
	document.getElementById('wordAreaID').value = localStorage.getItem('old_' + gTitle)
	update()
}

function newWindow() {
	var wordString = 'abstract project=untitled part=untitled date=' + (new Date()).toLocaleDateString()
	window.open('?' + getCompressToEncodedURI(wordString + ' {' + getJoinWord() + '}'))
}

function querySelectChanged() {
	var querySelect = document.getElementById('querySelectID')
	gCurrentKey = querySelect.options[querySelect.selectedIndex].text
	updateStorageTextLink()
}

function redo() {
	gCurrentKey = gRedoMap.get(gCurrentKey)
	updateStorageTextLink()
	updateSelect(document.getElementById('querySelectID'))
}

function save() {
	var blob = new Blob([sessionStorage.getItem(gCurrentKey)], {type: "text/plain;charset=utf-8"});
	saveAs(blob, gTitle.replace(/\./g, '_').replace(/\//g, '_').replace(/\-/g, '_').replace(/\ /g, '_') + '.txt');
	update()
}

function setNumberOfRows(id, lines) {
	var numberOfRows = 1
	var oneOverColumns = 1.0 / document.getElementById(id).cols
	for (var line of lines) {
		numberOfRows += Math.ceil(oneOverColumns * (line.length + 1))
	}
	document.getElementById(id).rows = numberOfRows
}

function setTextArea(textAreaID) {
	var query = document.URL
	var indexOfQuestionMark = query.indexOf('?')
	if (indexOfQuestionMark < 0) {
		query = ''
	}
	else {
		query = query.slice(indexOfQuestionMark + 1)
		query = query.replace(gEscapeExpression, function(find) {return gEscapeTable[find]})
		query = getDecompressFromEncodedURI(query)
		if (query == null) {
			query = ''
		}
	}
	var indexOfNewline = query.indexOf('\n')
	if (indexOfNewline < 0) {
		query = query.replace(/></g, '>\n<')
	}
	document.getElementById(textAreaID).value = query
}

function toggleEdit() {
	toggleSessionBoolean('isEditHidden@')
	updateEdit()
}

function toggleFile() {
	toggleSessionBoolean('isFileHidden@')
	updateFile()
}

function toggleSessionBoolean(booleanKey) {
	if (sessionStorage.getItem(booleanKey) == null) {
		sessionStorage.setItem(booleanKey, 't')
	}
	else {
		sessionStorage.removeItem(booleanKey)
	}
}

function undo() {
	gCurrentKey = gUndoMap.get(gCurrentKey)
	updateStorageTextLink()
	updateSelect(document.getElementById('querySelectID'))
}

function update() {
	var wordString = document.getElementById('wordAreaID').value
	var updateString = updateWordArea(wordString)
	if (updateString != undefined) {
		wordString = updateString
		document.getElementById('wordAreaID').value = updateString
	}
	if (gCurrentKey == null) {
		var localWordString = localStorage.getItem(gTitle)
		if (localWordString != null) {		
			if (localStorage.getItem('update_' + gTitle) == 'true') {		
				localStorage.setItem('old_' + gTitle, localWordString)
			}
		}
		localStorage.setItem('update_' + gTitle, 'false')
	}
	if (gRedoMap == null) {
		gRedoMap = getMapByString(sessionStorage.getItem('redoMapKey@'))
		gUndoMap = getMapByString(sessionStorage.getItem('undoMapKey@'))
	}
	var queryLink = document.getElementById('queryLinkID')
	gCurrentKey = null
	for (var keyIndex = 0; keyIndex < sessionStorage.length; keyIndex++) {
		var key = sessionStorage.key(keyIndex)
		if (sessionStorage.getItem(key) == wordString) {
			gCurrentKey = key
			break
		}
	}
	if (gCurrentKey == null) {
		var oldQueryKey = sessionStorage.getItem('oldQueryKeyKey@')
		var date = new Date()
		gCurrentKey = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
		if (oldQueryKey != null) {
			var oldLines = getBracketReplacedLinesByText(sessionStorage.getItem(oldQueryKey))
			var newLines = getBracketReplacedLinesByText(wordString)
			var firstDifferenceIndex = Math.min(oldLines.length, newLines.length)
			for (var differenceIndex = 0; differenceIndex < firstDifferenceIndex; differenceIndex++) {
				if (oldLines[differenceIndex] != newLines[differenceIndex]) {
					firstDifferenceIndex = differenceIndex
					break
				}
			}
			gCurrentKey = firstDifferenceIndex.toString() + ' - ' + gCurrentKey
			gRedoMap.set(oldQueryKey, gCurrentKey)
			gUndoMap.set(gCurrentKey, oldQueryKey)
			sessionStorage.setItem('redoMapKey@', getStringByMap(gRedoMap))
			sessionStorage.setItem('undoMapKey@', getStringByMap(gUndoMap))
		}
		sessionStorage.setItem(gCurrentKey, wordString)
		sessionStorage.setItem('oldQueryKeyKey@', gCurrentKey)
	}
	var querySelect = document.getElementById('querySelectID')
	if (sessionStorage.length > 1) {
		queryLink.hidden = false
		querySelect.hidden = false
	}
	var options = querySelect.options
	var optionSet = new Set()
	for (var optionIndex = 0; optionIndex < options.length; optionIndex++) {
		optionSet.add(options[optionIndex].text)
	}
	var sessionKeys = []
	for (var keyIndex = 0; keyIndex < sessionStorage.length; keyIndex++) {
		var key = sessionStorage.key(keyIndex)
		if (!key.endsWith('@')) {
			sessionKeys.push(key)
		}
	}
	sessionKeys.sort()
	for (var key of sessionKeys) {
		if (!optionSet.has(key)) {
			var option = document.createElement('option')
			option.text = key
			querySelect.add(option)
		}
	}
	updateFile()
	updateEdit()
	getWordStringUpdateStorage()
	updateLink(wordString)
	updateSelect(querySelect)
	if (gWordString != null) {
		if (gWordString != wordString && gTitle != null) {
			localStorage.setItem('update_' + gTitle, 'true')
		}
	}
	gWordString = wordString
}

function updateEdit() {
	var redoButton = document.getElementById('redoButtonID')
	var undoButton = document.getElementById('undoButtonID')
	redoButton.disabled = !gRedoMap.has(gCurrentKey)
	undoButton.disabled = !gUndoMap.has(gCurrentKey)
	var isEditHidden = !getSessionBoolean('isEditHidden@')
	redoButton.hidden = isEditHidden
	undoButton.hidden = isEditHidden
	document.getElementById('querySelectID').hidden = isEditHidden
	document.getElementById('queryLinkID').hidden = isEditHidden
}

function updateFile() {
	var loadLastSessionButton = document.getElementById('loadLastSessionButtonID')
	var loadASessionSelect = document.getElementById('loadASessionID')
	loadLastSessionButton.disabled = (localStorage.getItem('old_' + gTitle) == null)
	loadASessionSelect.disabled = localStorage.length == 0
	var options = loadASessionSelect.options
	if (options.length == 0) {
		var option = document.createElement('option')
		option.text = 'Load A Session'
		loadASessionSelect.add(option)
		option = document.createElement('option')
		option.text = ' '
		loadASessionSelect.add(option)
	}
	if (localStorage.length > 0) {
		var optionSet = new Set()
		for (var optionIndex = 0; optionIndex < options.length; optionIndex++) {
			optionSet.add(options[optionIndex].text)
		}
		var localStorageKeys = Object.keys(localStorage)
		localStorageKeys.sort()
		for (var key of localStorageKeys) {
			if (!optionSet.has(key)) {
				var option = document.createElement('option')
				option.text = key
				loadASessionSelect.add(option)
			}
		}
	}
	var isFileHidden = !getSessionBoolean('isFileHidden@')
	document.getElementById('newWindowButtonID').hidden = isFileHidden
	document.getElementById('browseID').hidden = isFileHidden
	loadASessionSelect.hidden = isFileHidden
	document.getElementById('saveButtonID').hidden = isFileHidden
	loadLastSessionButton.hidden = isFileHidden
}

function updateLink(wordString) {
	var queryLink = document.getElementById('queryLinkID')
	queryLink.innerHTML = gCurrentKey
	if (wordString == null) {
		queryLink.href = ''
		queryLink.innerHTML = 'n/a'
		return
	}
	var encodedURI = getCompressToEncodedURI(wordString)
	if (encodedURI.length > 0) {
		queryLink.href = '?' + encodedURI
	}
	else {
		queryLink.href = ''
		queryLink.innerHTML = 'n/a'
	}
}

function updateSelect(select) {
	options = select.options
	for (var optionIndex = 0; optionIndex < options.length; optionIndex++) {
		if (options[optionIndex].text == gCurrentKey) {
			select.selectedIndex = optionIndex
			break
		}
	}
}

function updateStorageTextLink() {
	var wordString = getWordStringUpdateStorage()
	updateWordArea(wordString)
	updateFile()
	updateEdit()
	updateLink(wordString)
}
