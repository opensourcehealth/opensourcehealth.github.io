//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

//var gAbstractID = undefined
var gBracketTable = {
	'&lt;':'<',
	'&gt;':'>'}
var gBracketExpression = new RegExp(Object.keys(gBracketTable).join("|"), "gi")
var gCurrentKey = undefined
//var gDate = undefined
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
	'%2C':',',
	'%E2%80%9C':'“',
	'%E2%80%9D':'”'}
var gEscapeExpression = new RegExp(Object.keys(gEscapeTable).join("|"), "gi")
var gGoMessage = undefined
const gLZStringHeader = 'lz_'
//var gProject = undefined
var gTitle = undefined
var gWordString = undefined
//var gURLMaximumLength = 1900

function addTextsToSelect(select, texts) {
	for (var text of texts) {
		var option = document.createElement('option')
		option.text = text
		select.add(option)
	}
}

var AlphabeticRepeatQ = {
alphabetSet: new Set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'),

compressWord: function(tokenMap, wordIndex, words) {
	var word = words[wordIndex]
	if (word.length < 2) {
		return
	}

	var lastCharacter = word[word.length - 1]
	if (gUpperCaseSet.has(lastCharacter)) {
		words[wordIndex] = word + 'Q'
		return
	}

	var lastCharacterUpper = lastCharacter.toUpperCase()
	for (var tokenLowerLength = 1; tokenLowerLength < word.length - 1; tokenLowerLength++) {
		var token = word.slice(0, tokenLowerLength) + lastCharacterUpper
		if (tokenMap.has(token)) {
			if (tokenMap.get(token) == word) {
				words[wordIndex] = token
				return
			}
		}
		else {
			tokenMap.set(token, word)
			return
		}
	}
},

expandWord: function(tokenMap, wordIndex, words) {
	var word = words[wordIndex]
	if (word.length < 2) {
		return
	}

	var lastCharacter = word[word.length - 1]
	if (lastCharacter == 'Q') {
		words[wordIndex] = word.slice(0, -1)
		return
	}

	if (tokenMap.has(word)) {
		words[wordIndex] = tokenMap.get(word)
		return
	}

	var lastCharacterUpper = lastCharacter.toUpperCase()
	for (var tokenLowerLength = 1; tokenLowerLength < word.length - 1; tokenLowerLength++) {
		var token = word.slice(0, tokenLowerLength) + lastCharacterUpper
		if (!tokenMap.has(token)) {
			tokenMap.set(token, word)
			return
		}
	}
},

getAlternatingAlphabeticWords: function(text) {
	var alternatingWords = []
	var wasAlphabet = false
	var textCharacters = text.split('')
	var wordCharacters = []
	for (var characterIndex = 0; characterIndex < text.length; characterIndex++) {
		var character = text[characterIndex]
		var isAlphabet = this.alphabetSet.has(character)
		if (isAlphabet != wasAlphabet) {
			alternatingWords.push(wordCharacters.join(''))
			wordCharacters = [character]
		}
		else {
			wordCharacters.push(character)
		}
		wasAlphabet = isAlphabet
	}

	if (wordCharacters.length > 0) {
		alternatingWords.push(wordCharacters.join(''))
	}

	return alternatingWords
},

getCompressed: function(text) {
	if (text == undefined) {
		return text
	}

	var words = this.getAlternatingAlphabeticWords(text)
	var tokenMap = new Map()
	for (var wordIndex = 1; wordIndex < words.length; wordIndex += 2) {
		this.compressWord(tokenMap, wordIndex, words)
	}

	return words.join('')
},

getExpanded: function(text) {
	if (text == undefined) {
		return text
	}

	var words = this.getAlternatingAlphabeticWords(text)
	var tokenMap = new Map()
	for (var wordIndex = 1; wordIndex < words.length; wordIndex += 2) {
		this.expandWord(tokenMap, wordIndex, words)
	}

	return words.join('')
}
}

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

function deleteSession() {
	var deleteSessionSelect = document.getElementById('deleteSessionID')
	var selectedIndex = deleteSessionSelect.selectedIndex
	var key = deleteSessionSelect.options[selectedIndex].text
	deleteSessionSelect.selectedIndex = 0
	if (arrayKit.getIsEmpty(key) || selectedIndex < 2) {
		return
	}

	localStorage.removeItem(key)
	updateSession()
}

function editMenuSelectChanged() {
	var editMenuSelect = document.getElementById('editMenuSelectID')
	var editMenuText = editMenuSelect.options[editMenuSelect.selectedIndex].text
	if (editMenuText.endsWith(' Others')) {
		toggleSessionBoolean('isEditHidden@')
	}
	else {
		if (editMenuText == 'Undo') {
			undo()
		}
		else {
			if (editMenuText == 'Redo') {
				redo()
			}
		}
	}

	editMenuSelect.selectedIndex = 0
	updateEdit()
}

function fileMenuSelectChanged() {
	var fileMenuSelect = document.getElementById('fileMenuSelectID')
	var fileMenuText = fileMenuSelect.options[fileMenuSelect.selectedIndex].text
	if (fileMenuText.endsWith(' Others')) {
		toggleSessionBoolean('isFileHidden@')
	}
	else {
		if (fileMenuText == 'New Window') {
			newWindow()
		}
		else {
			if (fileMenuText == 'Save To Archive') {
				saveToArchive()
			}
			else {
				if (fileMenuText == 'Save To Download Folder') {
					saveToDownloadFolder()
				}
			}
		}
	}

	fileMenuSelect.selectedIndex = 0
	updateFile()
}

function getBracketReplacedLinesByText(wordString) {
	return wordString.split(getEndOfLine(wordString))
}

function getCompressToEncodedURI(text) {
//	if (text.length < gURLMaximumLength) {
		return text.replaceAll('\n', '%0A').replaceAll(',', '%2C').replaceAll('\t', '%09').replaceAll('"', '%22')
//	}
/*
	var compressedText = gLZStringHeader + LZString.compressToEncodedURIComponent(text)
	if (compressedText.length < gURLMaximumLength) {
		return compressedText
	}
	var text = 'abstract'
	if (gProject != undefined) {
		text += ' project=' + gProject
	}
	if (gAbstractID != undefined) {
		text += ' part=' + gAbstractID
	}
	if (gDate != undefined) {
		text += ' date=' + gDate
	}
	text += ' note=The text is too long to fit into a url.'
	return text + ' So click on Load Last Session in the File menu to recover the text.'
*/
}

function getDecompressFromEncodedURI(text) {
	if (text.indexOf('=') == -1 && text.length > 99) {
		return LZString.decompressFromEncodedURIComponent(text.slice(text.lastIndexOf('_') + 1))
	}

	return text
}

function getDraftTitle(title) {
	return '0_Draft_ ' + title
}

function getIsWordStringNew(wordString) {
	if (arrayKit.getIsEmpty(wordString) || arrayKit.getIsEmpty(gTitle)) {
		return false
	}

	if (wordString == localStorage.getItem(gTitle)) {
		return false
	}
 
 	return wordString != localStorage.getItem(getDraftTitle(gTitle))
}

function getSessionBoolean(booleanKey) {
	if (sessionStorage.getItem(booleanKey) == undefined) {
		return true
	}

	return false
}

function getSessionKey() {
	var item = sessionStorage.getItem('goCount@')
	var goCount = 0
	if (!arrayKit.getIsEmpty(item)) {
		goCount = parseInt(item) + 1
	}

	var goCountString = goCount.toString()
	for (var characterIndex = goCountString.length; characterIndex < 3; characterIndex++) {
		goCountString = '0' + goCountString
	}

	sessionStorage.setItem('goCount@', goCountString)
	return goCountString + ' - '
}

function loadSessionChanged() {
	var loadSessionSelect = document.getElementById('loadSessionID')
	var selectedIndex = loadSessionSelect.selectedIndex
	var key = loadSessionSelect.options[selectedIndex].text
	loadSessionSelect.selectedIndex = 0
	if (selectedIndex < 2) {
		return
	}

	gGoMessage = 'Load ' + key
	document.getElementById('wordAreaID').value = localStorage.getItem(key)
	updateSession()
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
	var querySelect = document.getElementById('querySelectID')
	if (querySelect.selectedIndex < querySelect.options.length - 1) {
		querySelect.selectedIndex += 1
		querySelect.selectedIndex = Math.max(querySelect.selectedIndex, 2)
	}

	gCurrentKey = querySelect.options[querySelect.selectedIndex].text
	updateStorageTextLink()
}

function saveToArchive() {
	var wordString = document.getElementById('wordAreaID').value
	if (wordString == undefined || arrayKit.getIsEmpty(gTitle)) {
		return
	}

	localStorage.setItem(gTitle, wordString)
	var draftTitle = getDraftTitle(gTitle)
	localStorage.removeItem(draftTitle)
	updateSession()
}

function saveToDownloadFolder() {
	var blob = new Blob([sessionStorage.getItem(gCurrentKey)], {type: "text/plain;charset=utf-8"});
	saveAs(blob, gTitle.replaceAll('.', '_').replaceAll('/', '_').replaceAll('-', '_').replaceAll(' ', '_') + '.txt');
	updateSession()
}

function setNumberOfRows(id, lines) {
	var numberOfRows = 1
	var oneOverColumns = 1.0 / document.getElementById(id).cols
	for (var line of lines) {
		numberOfRows += Math.ceil(oneOverColumns * (line.length + 1))
	}

	document.getElementById(id).rows = numberOfRows
}

function setOthersMenuLine(isHidden, select) {
	var othersText = 'Hide Others'
	if (isHidden) {
		othersText = 'Show Others'
	}
	select.options[2].text = othersText
}

function setSelectToKeysIndexTitle(select, keys, selectedIndex, title) {
	setSelectToKeysTitle(select, keys, title)
	select.selectedIndex = selectedIndex
}

function setSelectToKeysTitle(select, keys, title) {
	var options = select.options
	var titleLength = (title != undefined) * 2
	var totalLength = keys.length + titleLength
	var isSame = totalLength == options.length
	if (isSame) {
		for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
			if (options[keyIndex + titleLength].text != keys[keyIndex]) {
				isSame = false
				break
			}
		}
	}

	if (isSame) {
		return
	}

	for (var optionIndex = options.length - 1; optionIndex > -1; optionIndex--) {
		options.remove(optionIndex)
	}

	if (title != undefined) {
		addTextsToSelect(select, [title, ' '])
	}

	addTextsToSelect(select, keys)
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
		if (query == undefined) {
			query = ''
		}
	}

	var indexOfNewline = query.indexOf('\n')
	if (indexOfNewline < 0) {
		query = query.replaceAll('><', '>\n<')
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
	if (sessionStorage.getItem(booleanKey) == undefined) {
		sessionStorage.setItem(booleanKey, 't')
	}
	else {
		sessionStorage.removeItem(booleanKey)
	}
}

function undo() {
	var querySelect = document.getElementById('querySelectID')
	if (querySelect.selectedIndex > 2) {
		querySelect.selectedIndex -= 1
	}

	gCurrentKey = querySelect.options[querySelect.selectedIndex].text
	updateStorageTextLink()
}

function update() {
	updateSession()
	if (getIsWordStringNew(gWordString)) {
		localStorage.setItem(getDraftTitle(gTitle), gWordString)
		updateFile()
	}
}

function updateSession() {
	var wordString = document.getElementById('wordAreaID').value
	var updateString = updateWordArea(wordString)
	if (updateString != undefined) {
		wordString = updateString
		document.getElementById('wordAreaID').value = updateString
	}

	var queryLink = document.getElementById('queryLinkID')
	gCurrentKey = undefined
	for (var keyIndex = 0; keyIndex < sessionStorage.length; keyIndex++) {
		var key = sessionStorage.key(keyIndex)
		if (sessionStorage.getItem(key) == wordString) {
			gCurrentKey = key
			break
		}
	}

	if (gCurrentKey == undefined) {
		gCurrentKey = getSessionKey()
		if (gWordString == undefined) {
			if (gTitle != undefined) {
				var draftTitle = getDraftTitle(gTitle)
				var title = undefined
				if (localStorage.getItem(draftTitle) == undefined) {
					if (localStorage.getItem(gTitle) != undefined) {
						title = gTitle
					}
				}
				else {
					title = draftTitle
				}
				if (title != undefined) {
					if (getIsWordStringNew(wordString)) {
						sessionStorage.setItem(getSessionKey() + 'Load ' + title, localStorage.getItem(title))
					}
				}
				gCurrentKey += 'Decode ' + gTitle
			}
		}
		else {
			if (gGoMessage == undefined) {
				var oldLines = getBracketReplacedLinesByText(gWordString)
				var lines = getBracketReplacedLinesByText(wordString)
				var firstDifferenceIndex = Math.min(oldLines.length, lines.length) - 1
				var differenceIndex = 0
				for (; differenceIndex < firstDifferenceIndex; differenceIndex++) {
					if (oldLines[differenceIndex] != lines[differenceIndex]) {
						break
					}
				}
				gCurrentKey += 'Line: ' + differenceIndex.toString()
				var statement = getStatement(lines[differenceIndex])
				if (statement.tag != undefined) {
					gCurrentKey = gCurrentKey + ' - ' + statement.tag
				}
			}
			else {
				gCurrentKey += gGoMessage
				gGoMessage = undefined
			}
		}
		sessionStorage.setItem(gCurrentKey, wordString)
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

	setSelectToKeysTitle(querySelect, sessionKeys.sort(), 'Go')
	updateFile()
	updateSelect(querySelect)
	updateEdit()
	updateLink(wordString)
	gWordString = wordString
}

function updateEdit() {
	var querySelect = document.getElementById('querySelectID')
	var isEditHidden = !getSessionBoolean('isEditHidden@')
	querySelect.hidden = isEditHidden
	var editMenuSelect = document.getElementById('editMenuSelectID')
	var editMenuKeys = ['']
	if (querySelect.selectedIndex < 3) {
		editMenuKeys.push('')
	}
	else {
		editMenuKeys.push('Undo')
	}

	if (Math.max(querySelect.selectedIndex, 2) > querySelect.options.length - 2) {
		editMenuKeys.push('')
	}
	else {
		editMenuKeys.push('Redo')
	}

	setSelectToKeysIndexTitle(editMenuSelect, editMenuKeys, 0, 'Edit')
	setOthersMenuLine(isEditHidden, editMenuSelect)
	document.getElementById('queryLinkID').hidden = isEditHidden
}

function updateFile() {
	var isFileHidden = !getSessionBoolean('isFileHidden@')
	var fileMenuSelect = document.getElementById('fileMenuSelectID')
	var fileMenuKeys = ['', 'New Window', 'Save To Archive', 'Save To Download Folder']
	setSelectToKeysIndexTitle(fileMenuSelect, fileMenuKeys, 0, 'File')
	setOthersMenuLine(isFileHidden, fileMenuSelect)
	var loadSessionSelect = document.getElementById('loadSessionID')
	loadSessionSelect.disabled = localStorage.length == 0
	setSelectToKeysTitle(loadSessionSelect, Object.keys(localStorage).sort(), 'Load Session')
	loadSessionSelect.hidden = isFileHidden
	document.getElementById('browseID').hidden = isFileHidden
	var deleteSessionSelect = document.getElementById('deleteSessionID')
	deleteSessionSelect.disabled = localStorage.length == 0
	setSelectToKeysTitle(deleteSessionSelect, new Array(6).fill('').concat(Object.keys(localStorage).sort()), 'Delete Session')
	deleteSessionSelect.hidden = isFileHidden
}

function updateLink(wordString) {
	var queryLink = document.getElementById('queryLinkID')
	queryLink.innerHTML = gCurrentKey
	if (wordString == undefined) {
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
	var wordString = sessionStorage.getItem(gCurrentKey)
	if (arrayKit.getIsEmpty(wordString)) {
		wordString = ''
	}

	document.getElementById('wordAreaID').value = wordString
	updateWordArea(wordString)
	if (getIsWordStringNew(wordString)) {
		localStorage.setItem(getDraftTitle(gTitle), wordString)
	}

	updateFile()
	updateEdit()
	updateLink(wordString)
}
