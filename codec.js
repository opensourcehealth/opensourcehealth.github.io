//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gBackupNumberOfUpdates = -1
var gBracketTable = {
	'&lt;':'<',
	'&gt;':'>'}
var gEscapeTable = {
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
var gBracketExpression = new RegExp(Object.keys(gBracketTable).join("|"), "gi")
var gEscapeExpression =	new RegExp(Object.keys(gEscapeTable).join("|"), "gi")
const gLZStringHeader = 'lz_'
const gQueryDivider = '!@#$%^&_never_use_reserved_storage_divider'
var gQueryMap = new Map()
var gQueryLinkID = 'queryLink'
var gQuerySelectID = null

function getBracketReplacedLines(textAreaID) {
	var wordString = document.getElementById(textAreaID).value
	wordString = wordString.replace(gBracketExpression, function(find) {return gBracketTable[find]})
	return wordString.split(getEndOfLine(wordString))
}

function getCompressToEncodedURI(text) {
	if (text.length < 1400) {
		return text.replace(/\n/g, '%0A').replace(/,/g, '%2C')
	}
	return gLZStringHeader + LZString.compressToEncodedURIComponent(text)
}

function getDecompressFromEncodedURI(text) {
	if (text.indexOf('=') == -1) {
		return LZString.decompressFromEncodedURIComponent(text.slice(text.lastIndexOf('_') + 1))
	}
	return text
}

function querySelectChanged() {
	var querySelect = document.getElementById(gQuerySelectID)
	var queryKey = querySelect.options[querySelect.selectedIndex].text
	if (gQueryMap.has(queryKey)) {
		var queryLink = document.getElementById(gQueryLinkID)
		queryLink.href = '?' + gQueryMap.get(queryKey)
		queryLink.innerHTML = 'Go'
	}
}

function setNumberOfRows(id, lines) {
	var numberOfRows = 1
	var oneOverColumns = 1.0 / document.getElementById(id).cols
	for (var line of lines) {
		numberOfRows += Math.ceil(oneOverColumns * (line.length + 1))
	}
	document.getElementById(id).rows = numberOfRows
}

function setQueryStorage(newButtonID, querySelectID, wordString) {
	var date = new Date()
	gQuerySelectID = querySelectID
	var queryTime = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
	var queryLink = document.getElementById(gQueryLinkID)
	var queryValue = wordString
//	var queryValue = wordString.replace(/\n/g, '%0A').replace(/,/g, '%2C')
	if (typeof(Storage) == "undefined" || querySelectID == null) {
		gBackupNumberOfUpdates += 1
		if (gBackupNumberOfUpdates > 0) {
			queryLink.hidden = false
			queryLink.href = '?' + queryValue
			queryLink.innerHTML = 'Update ' + gBackupNumberOfUpdates.toString() + ' - ' + queryTime
		}
		return
	}
	var queries = []
	var query = queryTime + ';' + queryValue
	if (sessionStorage.queries) {
		queries = sessionStorage.queries.split(gQueryDivider)
	}
	var identicalKey = null
	for (queryIndex = 0; queryIndex < queries.length; queryIndex++) {
		storageQuery = queries[queryIndex]
		var indexOfSemicolon = storageQuery.indexOf(';')
		if (indexOfSemicolon != -1) {
			if (storageQuery.slice(indexOfSemicolon + 1) == queryValue) {
				identicalKey = storageQuery.slice(0, indexOfSemicolon)
				queryIndex = queries.length
			}
		}
	}
	if (identicalKey == null) {
		query = queries.length.toString() + ' - ' + query
		queries.push(query)
		var indexOfSemicolon = query.indexOf(';')
		var identicalKey = query.slice(0, indexOfSemicolon)
	}
	sessionStorage.queries = queries.join(gQueryDivider)
	var querySelect = document.getElementById(querySelectID)
	if (queries.length > 1) {
		if (newButtonID != null) {
			document.getElementById(newButtonID).hidden = false
		}
		queryLink.hidden = false
		querySelect.hidden = false
	}
	for (var query of queries) {
		var indexOfSemicolon = query.indexOf(';')
		var key = query.slice(0, indexOfSemicolon)
		if (!gQueryMap.has(key)) {
			var option = document.createElement('option')
			option.text = key
			querySelect.add(option)
			gQueryMap.set(key, getCompressToEncodedURI(query.slice(indexOfSemicolon + 1)))
//			gQueryMap.set(key, query.slice(indexOfSemicolon + 1))
		}
	}
	var options = querySelect.options
	for (optionIndex = 0; optionIndex < options.length; optionIndex++) {
		if (options[optionIndex].text == identicalKey) {
			querySelect.selectedIndex = optionIndex
			queryLink.href = '?' + gQueryMap.get(identicalKey)
			queryLink.innerHTML = 'Go'
			optionIndex = options.length
		}
	}
}

function setTextArea(textAreaID) {
	var query = document.URL
	var indexOfQuestionMark = query.indexOf('?')
	if (indexOfQuestionMark < 0) {
		query = ''
	}
	else {
		query = query.slice(indexOfQuestionMark + 1)
	}
	query = query.replace(gEscapeExpression, function(find) {return gEscapeTable[find]})
	query = getDecompressFromEncodedURI(query)
	var indexOfNewline = query.indexOf('\n')
	if (indexOfNewline < 0) {
		query = query.replace(/></g, '>\n<')
	}
	document.getElementById(textAreaID).value = query
}

function windowNew() {
	var querySelect = document.getElementById(gQuerySelectID)
	var queryKey = querySelect.options[querySelect.selectedIndex].text
	if (gQueryMap.has(queryKey)) {
		window.open('?' + gQueryMap.get(queryKey))
	}
}
