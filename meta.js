//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gCopyIDMap = new Map()
const gCopyTypeSet = new Set(['copy','row'])
const gLowerCharacterSet = new Set('abcdefghijklmnopqrstuvwxyz_'.split(''))
const gIDSet = new Set(['id'])
const gIDTransformWork = ['id', 'transform', 'transform3D', 'work']
const gIDPointsTransformWorkSet = new Set(gIDTransformWork.concat(['points', 'pointsHD']))
const gDisplayIDTransformWorkSet = new Set(['display', 'process'].concat(gIDTransformWork))
var gCopyIDKeySet = new Set(['work'])
var gLongWordSet = undefined
const gMapR = new Map([['r', true]])
const gMapRS = new Map([['r', true], ['s', '1']])
const gMapRS2 = new Map([['r', true], ['s', '11']])
const gMapS = new Map([['s', '1']])

function addEntriesToStatementLine(entries, registry, statement) {
	var line = registry.lines[statement.lineIndex]
	for (var entry of entries) {
		statement.attributeMap.set(entry[0], entry[1])
	}
	if (line.trim().startsWith('<')) {
		line = getLineByStatement(statement)
	}
	else {
		var attributePairs = []
		for (var entry of statement.attributeMap.entries()) {
			attributePairs.push(entry[0] + '=' + entry[1])
		}
		line = statement.tag + ' ' + attributePairs.join(' ')
	}
	registry.lines[statement.lineIndex] = line
	registry.lineUpdated = true
}

function addFunctionToMap(functionToAdd, optionMap, map = gFunctionMap) {
	if (optionMap != undefined) {
		functionToAdd.optionMap = optionMap
	}

	map.set(functionToAdd.name, functionToAdd)
}

function addFunctionsToMap(functionsToAdd, optionMap, map) {
	for (var functionToAdd of functionsToAdd) {
		addFunctionToMap(functionToAdd, optionMap, map)
	}
}

function addHeading(title) {
	var heading = document.createElement('H3')
	heading.appendChild(document.createTextNode(title))
	document.body.appendChild(heading)
}

function addMeshesRecursively(depth, meshes, registry, statement) {
	if (depth > gRecursionLimit) {
		return
	}

	var mesh = getMeshByID(statement.attributeMap.get('id'), registry)
	if (mesh != undefined) {
		meshes.push(getMeshCopy(mesh))
	}

	depth += 1
	for (var child of statement.children) {
		addMeshesRecursively(depth, meshes, registry, child)
	}

	return meshes
}

function addMeshesToGroupStatement(idStart, meshes, registry, statement) {
	for (var mesh of meshes) {
		var meshStatement = getStatementByParentTag(new Map(), 0, statement, 'mesh')
		MapKit.copyKeysExcept(meshStatement.attributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
		getUniqueID(idStart, registry, meshStatement)
		analyzeOutputMesh(getMeshCopy(mesh), registry, meshStatement)
	}

	MapKit.deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
}

function addMeshToStatement(inputArea, mesh, registry, statement) {
	if (mesh == undefined) {
		var facets = getPointsByKey('facets', registry, statement)
		var points = getPointsByKey('points', registry, statement)
		if (facets != undefined && points != undefined) {
			mesh = {facets:facets, points:points}
		}
	}
	else {
		if (getBooleanByDefault('updateStatement', registry, statement, statement.tag, false)) {
			var pointsString = Polyline.getString(mesh.points)
			addEntriesToStatementLine([['points', pointsString], ['facets', Polyline.getString(mesh.facets)]], registry, statement)
			inputArea.value = ''
		}
	}
	if (mesh != undefined) {
		analyzeOutputMesh(mesh, registry, statement)
	}
}

function addOptionMapToObject(functionNames, object, optionMap) {
	for (var functionName of functionNames) {
		object[functionName].optionMap = optionMap
	}
}

function addOutputArea(text, title) {
	if (Vector.isEmpty(text)) {
		return
	}

	var textAreaID = 'output_area_' + title
	var textArea = document.getElementById(textAreaID)
	if (textArea == null) {
		title = 'Output - ' + title
		addHeading(title)
		getNewTextArea(textAreaID).value = text
	}
	else {
		textArea.value = text
	}
}

function addPointsToGroupStatement(idStart, pointsStatements, registry, statement) {
	for (var pointsStatement of pointsStatements) {
		var tagStatement = getStatementByParentTag(new Map(), 0, statement, pointsStatement.statement.tag)
		MapKit.copyKeysExcept(tagStatement.attributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
		getUniqueID(idStart, registry, tagStatement)
		setPointsExcept(Polyline.copy(pointsStatement.points), registry, tagStatement)
	}

	MapKit.deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
}

function addStatementRecursively(depth, parent, registry, workStatement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in addStatementRecursively reached, no further statements will be added.'
		warningByList([warningText, parent, gRecursionLimit])
		return
	}

	if (gCopyTypeSet.has(workStatement.tag) && depth > 10) {
		printCaller(['Will not add a copy type statement with depth > 10 in addStatementRecursively in meta.', statement, workStatement])
		return
	}

	var statement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, parent, workStatement.tag)
	var attributeMap = statement.attributeMap
	var workID = workStatement.attributeMap.get('id')
	gCopyIDMap.set(workID, getUniqueID(parent.attributeMap.get('id') + '_' + workID, registry, statement))
	MapKit.copyMissingKeysExcept(attributeMap, workStatement.attributeMap, gIDSet)
	for (var attributeKey of attributeMap.keys()) {
		if (gCopyIDKeySet.has(attributeKey)) {
			var copyIDs = attributeMap.get(attributeKey).split(' ').filter(lengthCheck)
			for (var copyIDIndex = 0; copyIDIndex < copyIDs.length; copyIDIndex++) {
				if (gCopyIDMap.has(copyIDs[copyIDIndex])) {
					copyIDs[copyIDIndex] = gCopyIDMap.get(copyIDs[copyIDIndex])
				}
			}
			attributeMap.set(attributeKey, copyIDs.join(' '))
		}
		if (attributeMap.get(attributeKey).indexOf('ByID') > -1) {
			for (var byIDName of gByIDNames) {
				var splitValues = attributeMap.get(attributeKey).split(byIDName)
				if (splitValues.length > 1) {
					for (var splitValueIndex = 1; splitValueIndex < splitValues.length; splitValueIndex++) {
						var splitValue = splitValues[splitValueIndex]
						if (splitValue.trim().startsWith('(')) {
							var indexOf = Math.max(splitValue.indexOf(')'), splitValue.indexOf(','))
							if (indexOf > -1) {
								var indexBracketPlus = splitValue.indexOf('(') + 1
								var copyID = splitValue.slice(indexBracketPlus, indexOf)
								if (gCopyIDMap.has(copyID)) {
									var prefix = splitValue.slice(0, indexBracketPlus)
									splitValues[splitValueIndex] = prefix + gCopyIDMap.get(copyID) + splitValue.slice(indexOf)
								}
							}
						}
					}
					attributeMap.set(attributeKey, splitValues.join(byIDName))
				}
			}
		}
	}

	var work2DMatrix = getMatrix2D(registry, workStatement)
	if (work2DMatrix != undefined) {
		statement.attributeMap.set('transform', 'matrix(' + work2DMatrix.toString() + ')')
	}

	var work3DMatrix = getMatrix3D(registry, workStatement)
	if (work3DMatrix != undefined) {
		statement.attributeMap.set('transform3D', 'matrix(' + work3DMatrix.toString() + ')')
	}

	depth += 1
	for (var child of workStatement.children) {
		addStatementRecursively(depth, statement, registry, child)
	}
}

function alterStatementRecursively(depth, registry, statement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in alterStatementRecursively reached, no further statements will be altered.'
		warningByList([warningText, statement, gRecursionLimit])
		return
	}

	depth += 1
	for (var child of statement.children) {
		alterStatementRecursively(depth, registry, child)
	}

	alterStatementPoints(registry, statement)
}

function collectArticles(click) {
	var button = click.explicitOriginalTarget
	var inputArea = button.inputArea
	var text = inputArea.value
	if (text.trim().length == 0) {
		return
	}

	collectArticlesProcessor.addressTitles = []
	collectArticlesProcessor.isTag = false
	collectArticlesProcessor.potentialSections = []
	collectArticlesProcessor.statementObject = inputArea.statementObject
	button.outputArea.value = collectArticlesProcessor.getOutput(text)
}

var collectArticlesProcessor = {
convertElement: function(endOfLine) {
	var healthSections = []
	var healthStrings = new Set(['__bibliography', '__biology', '__treatment'])
	var id = undefined
	var sectionSet = new Set()
	for (var potentialSection of this.potentialSections) {
		id = this.getLineID(endOfLine, id, potentialSection)
		if (id != undefined) {
			if (maximumIndexOf(id, healthStrings) > -1) {
				var concatenated = ''
				var ids = id.split('__')
				for (var sectionID of ids) {
					concatenated += sectionID
					sectionSet.add(concatenated)
					concatenated += '__'
				}
			}
		}
	}

	id = undefined
	var numberOfTopParagraphs = 0
	for (var potentialSection of this.potentialSections) {
		id = this.getLineID(endOfLine, id, potentialSection)
		if (sectionSet.has(id)) {
			if (id.split('__').length == 1) {
				numberOfTopParagraphs++
				if (numberOfTopParagraphs < 3) {
					healthSections.push(potentialSection)
				}
			}
			else {
				if (id.endsWith('__bibliography')) {
					var lines = potentialSection.split(endOfLine)
					for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
						if (lines[lineIndex].trim().startsWith('<li>')) {
							lines[lineIndex] = undefined
						}
					}
					Vector.removeUndefineds(lines)
					potentialSection = lines.join(endOfLine)
				}
				healthSections.push(potentialSection)
			}
		}
	}

	this.potentialSections = healthSections
},

getLineID: function(endOfLine, id, text) {
	var line = text.trim().split(endOfLine)[0]
	var indexOfHeadingEnd = line.indexOf('</h')
	var indexOfID = line.indexOf('id="')
	if (indexOfHeadingEnd == -1 || indexOfID == -1) {
		return id
	}

	line = line.slice(indexOfID + 'id="'.length)
	var indexOfIDEnd = line.indexOf('"')
	if (indexOfIDEnd == -1) {
		return id
	}

	return line.slice(0, indexOfIDEnd)
},

getOutput: function(text) {
	var endOfLine = getEndOfLine(text)
	var sections = getSplitFilterLength(text, endOfLine + endOfLine)
	this.sections = []
	for (var section of sections) {
		this.processHTMLSection(endOfLine, section.split(endOfLine), section)
	}

	var endOfSection = endOfLine + endOfLine
	var collectionText = this.sections.join(endOfSection)
	var contentsString = '<h1>Table of Contents</h1>'
	var indexOfContents = text.indexOf(contentsString)
	if (indexOfContents < 0) {
		return collectionText
	}

	indexOfContents += contentsString.length
	var outputSections = [text.slice(0, indexOfContents)]
	Vector.pushArray(outputSections , addTableOfContentsProcessor.getAddressLines(this.addressTitles, endOfLine))
	return outputSections.join(endOfLine) + '\n<h1>Articles</h1>' + endOfSection + collectionText + endOfSection + '</body>\n</html>'
},

processHTMLSection: function(endOfLine, lines, text) {
	var line = lines[0].trim()
	if (line.startsWith('<h2>')) {
		this.potentialSections = [text]
		this.addressTitle = addTableOfContentsProcessor.getAddressTitle(text)
		return
	}

	if (line.startsWith('<h3>') && line.indexOf('Tags</') > 0) {
		this.isTag = true
		return
	}

	if (this.isTag) {
		this.isTag = false
		var indexOfEndTag = text.indexOf('</')
		if (indexOfEndTag < 1) {
			return
		}
		text = text.slice(0, indexOfEndTag)
		var beginTag = '<p>'
		var indexOfBeginTag = text.indexOf(beginTag)
		if (indexOfBeginTag < 0) {
			return
		}
		var tags = text.slice(indexOfBeginTag + beginTag.length).split(',')
		for (var tag of tags) {
			if (tag.trim().toLowerCase() == this.statementObject.collectionName) {
				for (var searchTag of tags) {
					if (searchTag.trim().toLowerCase() == 'element' && this.statementObject.shouldConvertElement) {
						this.convertElement(endOfLine)
					}
				}
				Vector.pushArray(this.sections, this.potentialSections)
				this.isTag = false
				this.potentialSections = undefined
				if (this.addressTitle != undefined) {
					this.addressTitles.push(this.addressTitle)
				}
				return
			}
		}
		return
	}

	if (!Vector.isEmpty(this.potentialSections)) {
		this.potentialSections.push(text)
	}
}
}

function addTableOfContents(click) {
	var button = click.explicitOriginalTarget
	var text = button.inputArea.value
	if (text.trim().length == 0) {
		return
	}

	addTableOfContentsProcessor.addressTitles = []
	addTableOfContentsProcessor.bibliographyAddressMap = new Map()
	addTableOfContentsProcessor.superscriptMap = new Map()
	button.outputArea.value = addTableOfContentsProcessor.getOutput(text)
}

var addTableOfContentsProcessor = {
beforeAddress: '<sup><small><a href="#',

endQuote: '">',

getAddressLines: function(addressTitles, endOfLine) {
	var addressLines = []
	addressLines.push(endOfLine + '<ul>')
	for (var addressTitle of addressTitles) {
		addressLines.push('  <li><a href="#' + addressTitle.address + '">' + addressTitle.title + '</a></li>')
	}

	addressLines.push('</ul>' + endOfLine)
	return addressLines
},

getAddressTitle: function(title) {
	var indexOfID = title.indexOf('id="')
	if (indexOfID < 0) {
		return undefined
	}

	title = title.slice(indexOfID + 'id="'.length)
	var indexOfIDEnd = title.indexOf('"')
	if (indexOfIDEnd < 0) {
		return undefined
	}

	var address = title.slice(0, indexOfIDEnd)
	var indexOfTagEnd = title.indexOf('>')
	if (indexOfTagEnd < 0) {
		return undefined
	}

	title = title.slice(indexOfTagEnd + 1)
	var indexOfAddressEnd = title.indexOf('<')
	if (indexOfAddressEnd < 0) {
		return undefined
	}

	return this.getAddressTitleByAddress(address, title.slice(0, indexOfAddressEnd))
},

getAddressTitleByAddress: function(address, title) {
	titleLower = title.toLowerCase()
	shortTitle = titleLower
	var indexOfBracket = title.indexOf('(')
	if (indexOfBracket > -1) {
		shortTitle = shortTitle.slice(0, indexOfBracket).trim()
	}

	return {address:address, shortTitle:shortTitle, title:title, titleLower:titleLower}
},

getHTMLHeading: function(headingLevel, line) {
	var headingTagBracket = 'h' + headingLevel.toString() + '>'
	var prefix = '<' + headingTagBracket
	var indexOfHeading = line.indexOf(prefix)
	if (indexOfHeading != 0) {
		return undefined
	}

	var suffix = '</' + headingTagBracket
	indexOfHeading += prefix.length
	var indexOfEndHeading = line.indexOf(suffix)
	if (indexOfEndHeading < indexOfHeading) {
		return line
	}

	var title = line.slice(indexOfHeading, indexOfEndHeading).trim()
	if (this.addressTitles.length == 0) {
		return line
	}

	if (title.startsWith('<a ')) {
		this.subaddress = this.getAddressTitle(title).address
		return line
	}

	if (this.subaddress == undefined || headingLevel == 3) {
		this.subaddress = this.addressTitles[this.addressTitles.length - 1].address
	}

	if (headingLevel > 3) {
		this.subaddress = this.subaddress.split('__').slice(0, headingLevel - 2).join('__')
	}

	this.subaddress += '__' + title.toLowerCase().replaceAll(' ', '_')
	return prefix + '<a id="' + this.subaddress + '">' + title + '</a>' + suffix
},

getOutput: function(text) {
	var endOfLine = getEndOfLine(text)
	var sections = getSplitFilterLength(text, endOfLine + endOfLine)
	this.sections = []
	for (var section of sections) {
		this.processHTMLSection(endOfLine, section.split(endOfLine), section)
	}

	var output = this.sections.join(endOfLine + endOfLine)
	var contentsString = '<h1>Table of Contents</h1>'
	var indexOfContents = output.indexOf(contentsString)
	if (indexOfContents > -1) {
		indexOfContents += contentsString.length
		var indexOfArticles = output.indexOf('<h1>Articles</h1>')
		if (indexOfArticles > indexOfContents) {
			var outputSections = [output.slice(0, indexOfContents)]
			Vector.pushArray(outputSections , this.getAddressLines(this.addressTitles, endOfLine))
			outputSections.push(output.slice(indexOfArticles))
			output = outputSections.join(endOfLine)
		}
	}

	var lines = output.split(endOfLine)
	for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		var line = lines[lineIndex]
		var phrases = line.split(this.beforeAddress)
		if (phrases.length > 1) {
			for (var phraseIndex = 1; phraseIndex < phrases.length; phraseIndex++) {
				var phrase = phrases[phraseIndex]
				var indexOfEndQuote = phrase.indexOf(this.endQuote)
				if (indexOfEndQuote > 0) {
					var address = phrase.slice(0, indexOfEndQuote)
					if (this.bibliographyAddressMap.has(address)) {
						var indexOfEndAddress = phrase.indexOf('</a>')
						if (indexOfEndAddress > 0) {
							var beginLine = phrase.slice(0, indexOfEndQuote + this.endQuote.length)
							phrases[phraseIndex] = beginLine + this.bibliographyAddressMap.get(address) + phrase.slice(indexOfEndAddress)
						}
					}
				}
			}
			lines[lineIndex] = phrases.join(this.beforeAddress)
		}
	}

	var isParagraph = false
	var titleSet = new Set()
	var longAddressTitles = []
	for (var addressTitle of this.addressTitles) {
		if (addressTitle.shortTitle.split(' ').length > 1) {
			longAddressTitles.push(addressTitle)
		}
	}

	for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		var line = lines[lineIndex]
		var lineTrim = line.trim()
		if (lineTrim.startsWith('<h2>')) {
			titleSet.clear()
			titleSet.add(addTableOfContentsProcessor.getAddressTitle(line).shortTitle)
		}
		else {
			if (lineTrim.startsWith('<p>')) {
				isParagraph = true
			}
			if (isParagraph) {
				var lineLower = line.toLowerCase()
				for (var addressTitle of longAddressTitles) {
					var shortTitle = addressTitle.shortTitle
					var indexOfTitle = lineLower.indexOf(shortTitle)
					if (indexOfTitle > -1) {
						if (this.isReplaceable(indexOfTitle, lineLower, shortTitle, titleSet)) {
							var referenceLine = line.slice(0, indexOfTitle) + '<a href="#' + addressTitle.address + '">'
							var titleEnd = indexOfTitle + shortTitle.length
							if (indexOfTitle == lineLower.indexOf(addressTitle.titleLower)) {
								titleEnd = indexOfTitle + addressTitle.titleLower.length
							}
							referenceLine += line.slice(indexOfTitle, titleEnd) + '</a>' + line.slice(titleEnd)
							lines[lineIndex] = referenceLine
							var lineLower = referenceLine.toLowerCase()
						}
						titleSet.add(shortTitle)
					}
				}
			}
			if (lineTrim.endsWith('</p>')) {
				isParagraph = false
			}
		}
	}

	return lines.join(endOfLine)
},

isReplaceable: function(indexOfTitle, lineLower, shortTitle, titleSet) {
	var lineUntil = lineLower.slice(0, indexOfTitle)
	if (getCharacterCount(lineUntil, '<') != getCharacterCount(lineUntil, '>') || titleSet.has(shortTitle)) {
		return false
	}

	var indexOfEnd = indexOfTitle + shortTitle.length
	if (lineLower.length > indexOfEnd) {
		if (!this.punctuationSet.has(lineLower[indexOfEnd])) {
			return false
		}
	}

	if (indexOfTitle == 0) {
		return true
	}

	return lineLower[indexOfTitle - 1] == ' '
},

processHTMLSection: function(endOfLine, lines, text) {
	var lineZero = lines[0].trim()
	if (lineZero == '<ol>') {
		var bibliographyArrays = []
		var bibliographyLineIndexes = []
		for (var bibliographyLineIndex = 1; bibliographyLineIndex < lines.length; bibliographyLineIndex++) {
			var bibliographyLine = lines[bibliographyLineIndex]
			if (bibliographyLine.trim().startsWith('<li id="')) {
				var indexOfQuote = bibliographyLine.indexOf('"')
				var bibliographyLineAfter = bibliographyLine.slice(indexOfQuote + 1)
				var indexOfEndQuote = bibliographyLineAfter.indexOf(this.endQuote)
				if (indexOfEndQuote > 0) {
					var addressIndex = -1
					var address = bibliographyLineAfter.slice(0, indexOfEndQuote)
					if (this.superscriptMap.has(address)) {
						addressIndex = this.superscriptMap.get(address)
					}
					else {
						console.log('superscriptMap does not have: ' + address)
					}
					bibliographyArrays.push([addressIndex, address, bibliographyLine])
					bibliographyLineIndexes.push(bibliographyLineIndex)
				}
			}
		}
		bibliographyArrays.sort(Vector.compareElementZeroAscending)
		for (var bibliographyArrayIndex = 0; bibliographyArrayIndex < bibliographyArrays.length; bibliographyArrayIndex++) {
			var bibliographyArray = bibliographyArrays[bibliographyArrayIndex]
			lines[bibliographyLineIndexes[bibliographyArrayIndex]] = bibliographyArray[2]
			this.bibliographyAddressMap.set(bibliographyArray[1], (bibliographyArrayIndex + 1).toString())
		}
		this.sections.push(lines.join(endOfLine))
		return
	}

	for (var line of lines) {
		var phrases = line.split(this.beforeAddress)
		if (phrases.length > 1) {
			for (var phraseIndex = 1; phraseIndex < phrases.length; phraseIndex++) {
				var phrase = phrases[phraseIndex]
				var indexOfEndQuote = phrase.indexOf(this.endQuote)
				if (indexOfEndQuote > 0) {
					var address = phrase.slice(0, indexOfEndQuote)
					if (!this.superscriptMap.has(address)) {
						this.superscriptMap.set(address, this.superscriptMap.size)
					}
				}
			}
		}
	}

	var indexOfHeading2 = lineZero.indexOf('<h2>')
	if (indexOfHeading2 != 0) {
		for (var headingLevel = 3; headingLevel < 7; headingLevel++) {
			var heading = this.getHTMLHeading(headingLevel, lineZero)
			if (heading != undefined) {
				this.sections.push(heading)
				return
			}
		}
		this.sections.push(text)
		return
	}

	indexOfHeading2 += '<h2>'.length
	var indexOfEndHeading2 = lineZero.indexOf('</h2>')
	if (indexOfEndHeading2 < indexOfHeading2) {
		this.sections.push(text)
		return
	}

	var title = lineZero.slice(indexOfHeading2, indexOfEndHeading2).trim()
	if (title.startsWith('<a ')) {
		var addressTitle = this.getAddressTitle(title)
		if (addressTitle != undefined) {
			this.addressTitles.push(addressTitle)
		}
		this.sections.push(text)
		return
	}

	var address = title
	var indexOfBracket = address.indexOf('(')
	if (indexOfBracket > -1) {
		address = address.slice(0, indexOfBracket)
	}

	address = address.trim().toLowerCase().replaceAll(' ', '_')
	this.addressTitles.push(this.getAddressTitleByAddress(address, title))
	this.sections.push('<h2><a id="' + address + '">' + title + '</a></h2>')
},

punctuationSet: new Set([' ', ',', '.', ';', ':', "'"])
}

function addViewMesh(id, registry, statement) {
	registry.views.push(new ViewMesh(new AnalysisMesh(registry, statement), id))
}

function addViewPoints(id, registry, statement) {
	var analysisPoints = getAnalysisPoints(registry, statement)
	if (analysisPoints != undefined) {
		registry.views.push(new ViewPoints(analysisPoints, id))
	}
}

function alterStatementPoints(registry, statement) {
	var mesh = getMeshByID(statement.attributeMap.get('id'), registry)
	if (mesh != undefined) {
		alterMeshExcept(mesh, registry, statement)
		return
	}

	var points = getPointsHD(registry, statement)
	if (points != undefined) {
		setPointsHD(getPointsExcept(points, registry, statement), statement)
	}
}

function convertToHTML(click) {
	var button = click.explicitOriginalTarget
	var text = button.inputArea.value
	if (text.trim().length == 0) {
		return
	}

	button.outputArea.value = convertToHTMLProcessor.getOutput(text)
}

var convertToHTMLProcessor = {
afterUnderscoreSet: new Set([' ', ')', ',', '\r', '\n']),

beforeUnderscoreSet: new Set([' ', '(', '\r', '\n']),

bibliographySynonyms: ['Authorities', 'AUTHORITIES', 'BIBLIOGRAPHY', 'LITERATURE', 'REFERENCES'],

colorSet: new Set
('black blackish blue bluish brown cherry green greenish grey indigo orange orangish red reddish violet white yellow yellowish'.split(' ')),

getClosedText: function(tag, text) {
	var textWithoutSpaces = text.replaceAll(' ', '')
	var endTag = '</' + tag + '>'
	if (textWithoutSpaces.endsWith(endTag) || textWithoutSpaces.endsWith('</>')) {
		return this.getWithPrefixTag(tag, text, textWithoutSpaces)
	}

	if (textWithoutSpaces.endsWith('>') || textWithoutSpaces.endsWith('/')) {
		var lastIndexOfSlash = text.lastIndexOf('/')
		if (lastIndexOfSlash > -1) {
			for (var characterIndex = lastIndexOfSlash - 1; characterIndex > -1; characterIndex--) {
				var character = text[characterIndex]
				if (character != ' ' && character != '\n') {
					if (character != '<') {
						return this.getWithPrefixTag(tag, text.slice(0, characterIndex + 1) + endTag, textWithoutSpaces)
					}
				}
			}
		}
		else {
			return this.getWithPrefixTag(tag, text.slice(0, text.length - 1) + endTag, textWithoutSpaces)
		}
	}

	return this.getWithPrefixTag(tag, text + endTag, textWithoutSpaces)
},

getDegreeText: function(text) {
	return text.trim().replaceAll(' deg.', ' &deg;').replaceAll('deg.C', '&deg;C').replaceAll('°', '&deg;')
},

getHTMLTabTable: function(endOfLine, lines, text) {
	var tableLines = []
	for (var line of lines) {
		var line = line.trimEnd()
		if (line.length > 0) {
			var words = line.split('\t')
			for (var wordIndex = 0; wordIndex < words.length; wordIndex++) {
				var word = words[wordIndex].trim()
				var atIndex = word.indexOf('@')
				var attributeString = ''
				if (atIndex != -1) {
					var attributes = word.slice(0, atIndex).trim().split(',')
					word = word.slice(atIndex + 1)
					for (var attribute of attributes) {
						if (Number.isNaN(Number.parseInt(attribute))) {
							if (attribute.startsWith('c')) {
								attributeString += ' align="center"'
							}
							else {
								var parameters = attribute.trim().split('=')
								if (parameters.length == 2) {
									var value = parameters[1]
									var trimmedValue = value.trim()
									if (trimmedValue.length > 0) {
										if (!gQuoteSet.has(trimmedValue[0])) {
											value = '"' + value + '"'
										}
									}
									attributeString += ' ' + parameters[0] + '=' + value
								}
								else {
									attributeString += ' ' + attribute
								}
							}
						}
						else {
							attributeString += ' colspan="' + attribute + '"'
						}
					}
				}
				words[wordIndex] = '<td' + attributeString + '>' + removeExtraSpaces(word) + '</td>'
			}
			tableLines.push('<tr>' + endOfLine + words.join('') + endOfLine + '</tr>')
		}
	}

	if (tableLines.length == 0) {
		return ''
	}

	tableLines.splice(0, 0, this.tableString)
	tableLines.push('</table>')
	return tableLines.join(endOfLine)
},

getHTMLBibliography: function(bibliographySynonym, endOfLine, text) {
	var outputLines = ['<h3>Bibliography</h3>', '', '<ul>']
	var text = text.replaceAll('_', '').replaceAll(endOfLine, ' ').trim()
	if (text.endsWith('.')) {
		text = text.slice(0, text.length - 1)
	}

	var lines = text.split(';')
	for (var line of lines) {
		line = line.trim()
		if (line.length > 0) {
			line = getWithoutRepeatedCharacter(line, ' ')
			if (bibliographySynonym != undefined) {
				if (line.startsWith(bibliographySynonym)) {
					var characterIndex = bibliographySynonym.length
					for (; characterIndex < line.length; characterIndex++) {
						if (gAlphabetSet.has(line[characterIndex])) {
							break
						}
					}
					line = line.slice(characterIndex)
				}
				bibliographySynonym = undefined
			}
			outputLines.push('<li>' + line + '</li>')
		}
	}

	outputLines.push('</ul>')
	return outputLines.join(endOfLine)
},

getHTMLHeading: function(endOfLine, level, words) {
	for (var wordIndex = 0; wordIndex < words.length; wordIndex++) {
		var word = words[wordIndex].replace('.', '').replaceAll('_', '')
		word = word[0].toUpperCase() + word.slice(1)
		if (wordIndex > 0) {
			var lowerCaseWord = word.toLowerCase()
			if (this.lowerCaseSet.has(lowerCaseWord)) {
				word = lowerCaseWord
			}
		}
		words[wordIndex] = word
	}

	var tag = 'h' + level
	if (words.length > 0) {
		var wordZero = words[0]
		if (wordZero.startsWith('<h')) {
			var indexOfGreater = wordZero.indexOf('>')
			if (indexOfGreater > -1) {
				tag = wordZero.slice(1, indexOfGreater)
			}
		}
	}

	return this.getClosedText(tag, words.join(' ').trim())
},

getHTMLParagraph: function(endOfLine, lines, text) {
	var endOfSection = endOfLine + endOfLine
	text = this.getDegreeText(text)
	if (text.endsWith('--')) {
		text = text.slice(0, text.length - 2)
	}

	var lineZero = lines[0].trim()
	if (getCharacterCount(lineZero, '_') > 1 && lineZero.startsWith('_')) {
		var firstUnderscorePlus = lineZero.indexOf('_') + 1
		var secondUnderscore = lineZero.indexOf('_', firstUnderscorePlus)
		var title = lineZero.slice(firstUnderscorePlus, secondUnderscore)
		var words = title.split(' ').filter(lengthCheck)
		if (lineZero.slice(secondUnderscore + 1).startsWith('-')) {
			text = text.slice(secondUnderscore + 3)
		}
		else {
			text = title + text.slice(secondUnderscore + 1)
		}
		return this.getHTMLHeading(endOfLine, 3, words) + endOfSection + this.getParagraphWithoutMultipleSpaces(endOfLine, text)
	}

	var firstPeriod = lineZero.indexOf('.')
	if (firstPeriod > 0) {
		var afterPeriod = lineZero.slice(firstPeriod + 1).trim()
		var words = lineZero.slice(0, firstPeriod).split(' ').filter(lengthCheck)
		var heading = this.getHTMLHeading(endOfLine, 3, words) + endOfSection
		var lastText = endOfLine + lines.slice(1).join(endOfLine)
		if (afterPeriod.startsWith('--')) {
			return heading + this.getParagraphWithoutMultipleSpaces(endOfLine, afterPeriod.slice(2).trim() + lastText)
		}
		if (afterPeriod.startsWith('—')) {
			return heading + this.getParagraphWithoutMultipleSpaces(endOfLine, afterPeriod.slice(1).trim() + lastText)
		}
	}

	var allCaps = []
	var words = lineZero.split(' ').filter(lengthCheck)
	for (var wordIndex = 0; wordIndex < words.length; wordIndex++) {
		var word = words[wordIndex]
		var wordCheck = word.replaceAll('-', '').replaceAll(',', '').replaceAll('_', '')
		if (getIsUpperCase(wordCheck) && wordCheck.length > 1) {
			allCaps.push(word.toLowerCase())
			words[wordIndex] = word[0].toUpperCase() + word.slice(1).toLowerCase()
		}
	}

	if (allCaps.length > 0) {
		text = this.getDegreeText(words.join(' ') + endOfLine + lines.slice(1).join(endOfLine))
		return this.getHTMLHeading(endOfLine, 2, allCaps) + endOfSection + this.getParagraphWithoutMultipleSpaces(endOfLine, text)
	}

	return this.getParagraphWithoutMultipleSpaces(endOfLine, text)
},

getHTMLVerticalLineTable: function(endOfLine, lines, text) {
	var outputLines = [this.tableString]
	var maximumCharacterIndexMap = new Map()
	if (text.indexOf('+---') != -1) {
		for (var line of lines) {
			var characterIndexMap = getCharacterIndexMap(line, '|')
			if (characterIndexMap.size > maximumCharacterIndexMap.size) {
				maximumCharacterIndexMap = characterIndexMap
			}
		}
	}

	for (var line of lines) {
		if (line.indexOf('|') != -1 && line.indexOf('+---') == -1) {
			var dataCells = []
			if (maximumCharacterIndexMap.size == 0) {
				line = line.trim()
				if (line.startsWith('|||')) {
					dataCells.push('<td>')
				}
				var words = line.split('|').filter(lengthCheck)
				for (var word of words) {
					dataCells.push('<td>' + word.trim())
				}
			}
			else {
				var characterIndexMap = getCharacterIndexMap(line, '|')
				var oldIndex = undefined
				for (var characterIndex of characterIndexMap.keys()) {
					if (oldIndex != undefined) {
						var word = line.slice(oldIndex + 1, characterIndex).trim()
						var difference = maximumCharacterIndexMap.get(characterIndex) - maximumCharacterIndexMap.get(oldIndex)
						if (Number.isNaN(difference)) {
							difference = 1
						}
						if (difference == 1) {
							dataCells.push('<td>' + word)
						}
						else {
							dataCells.push('<td colspan="' + difference + '" style="text-align:center">' + word)
						}
					}
					oldIndex = characterIndex
				}
			}
			if (dataCells.length > 0) {
				outputLines.push('<tr>' + endOfLine + dataCells.join('</td>') + '</td>' + endOfLine + '</tr>')
			}
		}
	}

	outputLines.push('</table>')
	return outputLines.join(endOfLine)
},


getOutput: function(text) {
	var endOfLine = getEndOfLine(text)
	var sections = getSplitFilterLength(text, endOfLine + endOfLine)
	this.sections = []
	for (var section of sections) {
		this.processHTMLSection(endOfLine, section.split(endOfLine), section)
	}

	return this.sections.join(endOfLine + endOfLine)
},

getParagraphWithoutMultipleSpaces: function(endOfLine, text) {
	if (text.startsWith('<p>') && text.endsWith('</p>')) {
		return text
	}

	var body = removeExtraSpaces(text).trim()
	var characters = body.split('')
	if (body.startsWith('<')) {
		for (var characterIndex = 1; characterIndex < characters.length; characterIndex++) {
			if (characters[characterIndex] == 'p') {
				characters = characters.slice(characterIndex + 1)
				if (characters.length > 0) {
					if (characters[0] == '>') {
						characters = characters.slice(1)
					}
				}
				break
			}
			if (characters[characterIndex] != ' ') {
				return text
			}
		}
	}

	var quoteModulo = 0
	for (var characterIndex = 0; characterIndex < characters.length; characterIndex++) {
		if (characters[characterIndex] == '"') {
			if (quoteModulo == 0) {
				var nextIndex = characterIndex + 1
				if (nextIndex < characters.length) {
					if (characters[nextIndex] == ' ') {
						characters[nextIndex] = undefined
					}
				}
			}
			else {
				if (characters[characterIndex - 1] == ' ') {
					characters[characterIndex - 1] = undefined
				}
			}
			quoteModulo = 1 - quoteModulo
		}
	}

	Vector.removeUndefineds(characters)
	for (var characterIndex = 0; characterIndex < characters.length; characterIndex++) {
		if (characters[characterIndex] == '_') {
			var beforeCharacter = undefined
			var afterCharacter = undefined
			var beforeCharacterIndex = characterIndex - 1
			if (beforeCharacterIndex >= 0) {
				beforeCharacter = characters[beforeCharacterIndex]
			}
			var afterIndex = characterIndex + 1
			if (afterIndex < characters.length) {
				afterCharacter = characters[afterIndex]
			}
			if (this.beforeUnderscoreSet.has(beforeCharacter) || this.afterUnderscoreSet.has(afterCharacter)) {
				characters[characterIndex] = undefined
			}
		}
	}
	
	Vector.removeUndefineds(characters)
	var lines = characters.join('').split(endOfLine)
	for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		var line = lines[lineIndex]
		var words = line.split(' ').filter(lengthCheck)
		for (var wordIndex = 0; wordIndex < words.length; wordIndex++) {
			var word = words[wordIndex]
			var hyphenSplits = word.split('-').filter(lengthCheck)
			if (hyphenSplits.length > 1) {
				if ((this.colorSet.has(hyphenSplits[0]) && this.colorSet.has(hyphenSplits[1])) || this.separateWordSet.has(word)) {
					words[wordIndex] = word.replace('-', ' ')
				}
			}
		}
		lines[lineIndex] = words.join(' ')
	}

	var oldWord = ''
	for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		var line = lines[lineIndex]
		var words = line.split(' ').filter(lengthCheck)
		if (oldWord.endsWith('-') && words.length > 0) {
			var wordZero = words[0]
			var suffix = ''
			var lastLetter = wordZero[wordZero.length - 1]
			if (this.lastLetterSet.has(lastLetter)) {
				wordZero = wordZero.slice(0, wordZero.length - 1)
				suffix = lastLetter
			}
			var wrapWord = oldWord.slice(0, oldWord.length - 1) + wordZero
			var isWrap = gLongWordSet.has(wrapWord)
			if (!isWrap && wrapWord.endsWith('s')) {
				isWrap = gLongWordSet.has(wrapWord.slice(0, wrapWord.length - 1))
			}
			if (isWrap) {
				words[0] = wrapWord + suffix
				lines[lineIndex] = words.join(' ')
				var previousIndex = lineIndex - 1
				var oldWords = lines[previousIndex].split(' ').filter(lengthCheck)
				lines[previousIndex] = oldWords.slice(0, oldWords.length - 1).join(' ')
			}
		}
		if (words.length > 0) {
			oldWord = words[words.length - 1]
		}
		else {
			oldWord = ''
		}
	}

	return this.getClosedText('p', lines.join(endOfLine).replaceAll(' (q.v.)', ''))
},

getWithPrefixTag: function(tag, text, textWithoutSpaces) {
	var prefix = '<' + tag + '>'
	if (textWithoutSpaces.startsWith(prefix)) {
		return text
	}

	return prefix + text
},

joinedWords: 'di-iodide gastro-intestinal tri-iodide wall-paper wall-papers',

lastLetterSet: new Set(', . ; :'.split(' ')),

lowerCaseSet: new Set('a an and at but for if in nor of on or so the to yet'.split(' ')),

processHTMLSection: function(endOfLine, lines, text) {
	for (var bibliographySynonym of this.bibliographySynonyms) {
		if (text.indexOf(bibliographySynonym) != -1) {
			this.sections.push(this.getHTMLBibliography(bibliographySynonym, endOfLine, text))
			return
		}
	}

	if (lines.length == 1) {
		var words = lines[0].split(' ').filter(lengthCheck)
		if (words.length < 7) {
			this.sections.push(this.getHTMLHeading(endOfLine, 3, words))
			return
		}
	}

	if (getCharacterCount(text, '|') * 2 > lines.length) {
		this.sections.push(this.getHTMLVerticalLineTable(endOfLine, lines, text))
		return
	}

	if (getCharacterCount(text, '\t') > lines.length) {
		this.sections.push(this.getHTMLTabTable(endOfLine, lines, text))
		return
	}

	if (getCharacterVariance(text, ' ') > 2.0) {
		text = text.replaceAll('  ', '|')
		this.sections.push(this.getHTMLVerticalLineTable(endOfLine, text.split(endOfLine), text))
		return
	}

	this.sections.push(this.getHTMLParagraph(endOfLine, lines, text))
},

separateWordSet: new Set('brick-red easily-fusible furnace-smoke penta-valent sheep-dipping steel-grey tin-white twenty-four'.split(' ')),

tableString: '<table style="border:1px solid black;border-spacing:20px 0px;margin:20px 10px;padding-bottom:10px;padding-top:10px">'
}

function copyStatementRecursively(registry, statement, workStatement) {
	if (gCopyTypeSet.has(workStatement.tag)) {
		printCaller(['Will not copy a copy type statement in copyStatementRecursively in meta.', statement, workStatement])
		return
	}

	MapKit.copyMissingKeysExcept(statement.attributeMap, workStatement.attributeMap, gDisplayIDTransformWorkSet)
	var work2DMatrix = getChainSkipMatrix2D(registry, workStatement)
	if (work2DMatrix != undefined) {
		var statement2DMatrix = getMatrix2D(registry, statement)
		if (statement2DMatrix != undefined) {
			work2DMatrix = getMultiplied2DMatrix(statement2DMatrix, work2DMatrix)
		}
		statement.attributeMap.set('transform', 'matrix(' + work2DMatrix.toString() + ')')
	}

	var work3DMatrix = getChainMatrix3D(registry, workStatement)
	if (work3DMatrix != undefined) {
		var statement3DMatrix = getMatrix3D(registry, statement)
		if (statement3DMatrix != undefined) {
			work3DMatrix = getMultiplied3DMatrix(statement3DMatrix, work3DMatrix)
		}
		statement.attributeMap.set('transform3D', 'matrix(' + work3DMatrix.toString() + ')')
	}

	for (var child of workStatement.children) {
		addStatementRecursively(0, statement, registry, child)
	}

	if (getBooleanByDefault('alter', registry, statement, statement.tag, false)) {
		alterStatementRecursively(0, registry, statement)
	}
}

function getAttributeString(registry) {
	var attributeValues = []
	for (var line of registry.lines) {
		var statement = getStatement(line)
		if (statement.attributeMap != undefined) {
			for (var value of statement.attributeMap.values()) {
				attributeValues.push(value)
			}
		}
	}

	return attributeValues.join(' ')
}

function getDistanceSquaredToStatement(location, registry, statement) {
	var points = getPointsHD(registry, statement)
	var workMesh = getMeshByID(statement.attributeMap.get('id'), registry)
	if (workMesh != undefined) {
		points = workMesh.points
	}
	if (Vector.isEmpty(points)) {
		return Number.MAX_VALUE
	}
	var closestDistanceSquared = Number.MAX_VALUE
	for (var point of points) {
		var distanceSquared = VectorFast.distanceSquaredArray(location, point, 3)
		if (distanceSquared < closestDistanceSquared) {
			closestDistanceSquared = distanceSquared
		}
	}
	return closestDistanceSquared
}

function getGroupBoundingBox(caller, registry, statement) {
	var boundingBox = []
	var descendants = []
	addToProcessableDescendantsInsideFirst(descendants, statement)
	for (var child of descendants) {
		boundingBox = widenStatementBoundingBox(boundingBox, caller, registry, child)
	}

	return boundingBox
}

function getGroupBoundingBoxByArguments(id, registry, statement) {
	var groupStatement = getStatementByID(registry, statement, id)
	if (statement != groupStatement) {
		for (var whileCount = 0; whileCount < gLengthLimitRoot; whileCount++) {
			if (statement.attributeMap.get('id') == id) {
				printCaller(['Infinitely nested bounding box in getGroupBoundingBoxByArguments in function.', id, statement])
				return [[0.0, 0.0], [0.0, 0.0]]
			}
			statement = statement.parent
			if (statement == undefined) {
				break
			}
		}
	}

	return getGroupBoundingBox(groupStatement, registry, groupStatement)
}

function getInputArea(title) {
	var textAreaID = 'input_area_' + title
	var textArea = document.getElementById(textAreaID)
	if (textArea == null) {
		title = 'Input - ' + title
		addHeading(title)
		return getNewTextArea(textAreaID)
	}

	return textArea
}

function getMapByVariableObject(variableObject) {
	var map = new Map()
	var propertyNames = Object.getOwnPropertyNames(variableObject)
	for (var propertyName of propertyNames) {
		if (propertyName != 'prototype') {
			if (propertyName.endsWith('_Private')) {
				if (propertyName == 'modifyObject_Private') {
					variableObject[propertyName]()
				}
			}
			else {
				map.set(propertyName, variableObject[propertyName])
			}
		}
	}

	return map
}

function getMatrix2DsBySuffix(attributeMap, registry, statement, suffix) {
	var matrix2Ds = getPointsByKey(getSuffixedString('matrix2D', suffix), registry, statement)
	if (matrix2Ds == undefined) {
		matrix2Ds = []
	}

	var suffixedPlanes = getSuffixedString('plane', suffix)
	var planes = getPointsByKey(suffixedPlanes, registry, statement)
	if (planes != undefined) {
		for (var plane of planes) {
			matrix2Ds.push(getMatrix2DByPlane(plane))
		}
		attributeMap.set(suffixedPlanes, planes.join(' '))
	}

	var suffixedPolars = getSuffixedString('polar', suffix)
	var polars = getPointsByKey(suffixedPolars, registry, statement)
	if (polars != undefined) {
		for (var polar of polars) {
			matrix2Ds.push(getMatrix2DByPolar(polar))
		}
		attributeMap.set(suffixedPolars, polars.join(' '))
	}

	var workPoints = undefined
	if (suffix == undefined) {
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement != undefined) {
			workPoints = getPointsHD(registry, workStatement)
		}
	}

	var suffixedPolygon = getSuffixedString('polygon', suffix)
	var polygon = getPointsByKey(suffixedPolygon, registry, statement)
	var suffixedPolyline = getSuffixedString('polyline', suffix)
	var polyline = getPointsByKey(getSuffixedString('polyline', suffix), registry, statement)
	if (workPoints != undefined) {
		if (workStatement.tag == 'polygon') {
			polygon = Vector.getPushArray(polygon, workPoints)
		}
		else {
			if (workStatement.tag == 'polyline') {
				polyline = Vector.getPushArray(polygon, workPoints)
			}
		}
	}

	var suffixedScalePortion = getSuffixedString('scalePortion', suffix)
	var scalePortion = getFloatsByStatement(suffixedScalePortion, registry, statement)
	if (!Vector.isEmpty(scalePortion)) {
		if (scalePortion.length == 1) {
			scalePortion.push(scalePortion[0])
		}
		attributeMap.set(suffixedScalePortion, scalePortion.join(','))
	}

	if (polygon != undefined) {
		for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
			var nextIndex = (pointIndex + 1) % polygon.length
			matrix2Ds.push(getMatrix2DBySegmentPortion(polygon[pointIndex], polygon[nextIndex], scalePortion))
		}
		attributeMap.set(suffixedPolygon, polygon.join(' '))
	}

	if (polyline != undefined) {
		for (var pointIndex = 0; pointIndex < polyline.length - 1; pointIndex++) {
			matrix2Ds.push(getMatrix2DBySegmentPortion(polyline[pointIndex], polyline[pointIndex + 1], scalePortion))
		}
		attributeMap.set(suffixedPolyline, polyline.join(' '))
	}

	var suffixedScale = getSuffixedString('scale', suffix)
	var scale = getFloatsByStatement(suffixedScale, registry, statement)
	if (matrix2Ds.length > 0) {
		if (!Vector.isEmpty(scale)) {
			if (scale.length == 1) {
				scale.push(scale[0])
			}
			for (var matrix2D of matrix2Ds) {
				matrix2D[0] *= scale[0]
				matrix2D[1] *= scale[0]
				matrix2D[2] *= scale[1]
				matrix2D[3] *= scale[1]
			}
			attributeMap.set(suffixedScale, scale.join(','))
		}
	}

	return matrix2Ds
}

function getMatrix3DsBySuffix(attributeMap, registry, statement, suffix) {
	var matrix3Ds = getPointsByKey(getSuffixedString('matrix3D', suffix), registry, statement)
	if (matrix3Ds == undefined) {
		matrix3Ds = []
	}

	var suffixedPlanes = getSuffixedString('plane', suffix)
	var planes = getPointsByKey(suffixedPlanes, registry, statement)
	if (planes != undefined) {
		for (var plane of planes) {
			matrix3Ds.push(getMatrix3DByTranslate(plane))
		}
		attributeMap.set(suffixedPlanes, planes.join(' '))
	}

	var suffixedPolars = getSuffixedString('polar', suffix)
	var polars = getPointsByKey(suffixedPolars, registry, statement)
	if (polars != undefined) {
		for (var polar of polars) {
			matrix3Ds.push(getMatrix3DByPolar(polar))
		}
		attributeMap.set(suffixedPolars, polars.join(' '))
	}

	var workPoints = undefined
	if (suffix == undefined) {
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement != undefined) {
			workPoints = getPointsHD(registry, workStatement)
		}
	}

	var suffixedPolygon = getSuffixedString('polygon', suffix)
	var polygon = getPointsByKey(suffixedPolygon, registry, statement)
	var suffixedPolyline = getSuffixedString('polyline', suffix)
	var polyline = getPointsByKey(getSuffixedString('polyline', suffix), registry, statement)
	if (workPoints != undefined) {
		if (workStatement.tag == 'polygon') {
			polygon = Vector.getPushArray(polygon, workPoints)
		}
		else {
			if (workStatement.tag == 'polyline') {
				polyline= Vector.getPushArray(polygon, workPoints)
			}
		}
	}

	var suffixedScalePortion = getSuffixedString('scalePortion', suffix)
	var scalePortion = getFloatsByStatement(suffixedScalePortion, registry, statement)
	if (!Vector.isEmpty(scalePortion)) {
		if (scalePortion.length == 1) {
			scalePortion.push(scalePortion[0])
		}
		attributeMap.set(suffixedScalePortion, scalePortion.join(','))
	}

	if (polygon != undefined) {
		for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
			var nextIndex = (pointIndex + 1) % polygon.length
			matrix3Ds.push(getMatrix3DBySegmentPortion(polygon[pointIndex], polygon[nextIndex], scalePortion))
		}
		attributeMap.set(suffixedPolygon, polygon.join(' '))
	}

	if (polyline != undefined) {
		for (var pointIndex = 0; pointIndex < polyline.length - 1; pointIndex++) {
			matrix3Ds.push(getMatrix3DBySegmentPortion(polyline[pointIndex], polyline[pointIndex + 1], scalePortion))
		}
		attributeMap.set(suffixedPolyline, polyline.join(' '))
	}

	var suffixedScale = getSuffixedString('scale', suffix)
	var scale = getFloatsByStatement(suffixedScale, registry, statement)
	if (matrix3Ds.length > 0) {
		if (!Vector.isEmpty(scale)) {
			if (scale.length == 1) {
				scale.push(scale[0])
			}
			if (scale.length == 2) {
				scale.push(scale[1])
			}
			for (var matrix3D of matrix3Ds) {
				matrix3D[0] *= scale[0]
				matrix3D[1] *= scale[0]
				matrix3D[2] *= scale[0]
				matrix3D[4] *= scale[1]
				matrix3D[5] *= scale[1]
				matrix3D[6] *= scale[1]
				matrix3D[8] *= scale[2]
				matrix3D[9] *= scale[2]
				matrix3D[10] *= scale[2]
			}
			attributeMap.set(suffixedScale, scale.join(','))
		}
	}

	return matrix3Ds
}

function getMeshByID(id, registry) {
	return registry.meshMap.get(id)
}

function getNewButton(buttonFunction, textContent) {
	var button = document.createElement('button')
	button.onclick = buttonFunction
	button.textContent = textContent
	addHeading('')
	document.body.appendChild(button)
	return button
}

function getNewTextArea(textAreaID) {
	var textArea = document.createElement('textarea')
	textArea.cols = 120
	textArea.id = textAreaID
	textArea.rows = 4
	document.body.appendChild(textArea)
	return textArea
}

function getOutputOrWorkOrID(attributeMap) {
	if (attributeMap.has('output')) {
		return attributeMap.get('output')
	}
	if (attributeMap.has('work')) {
		return attributeMap.get('work')
	}
	return attributeMap.get('id')
}

function getSpreadsheetDelimiter(statement) {
	if (statement.attributeMap.has('delimiter')) {
		return statement.attributeMap.get('delimiter')
	}
	return '\t'
}

function getStatementByID(registry, statement, id) {
	if (id == undefined) {
		return statement
	}

	id = id.trim()
	if (id.length == 0) {
		return statement
	}

	if (id[0] == ('/')) {
		for (var depth = 0; depth < gRecursionLimit; depth++) {
			if (statement.parent == undefined) {
				return statement
			}
			statement = statement.parent
		}
		return statement
	}

	if (id[0] != ('.')) {
		if (registry.idMap.has(id)) {
			return registry.idMap.get(id)
		}
		return statement
	}

	for (var character of id) {
		if (statement.parent == undefined) {
			return statement
		}
		statement = statement.parent
	}

	return statement
}

function getSuffixedString(root, suffix) {
	if (suffix == undefined) {
		return root
	}
	return root + suffix
}

var hypertextProcessor = {
generateLinkList: function(filenames, id, prefix) {
	var localKeys = Object.keys(localStorage).sort()
	var links = []
	for (var filename of filenames) {
		for (var localKey of localKeys) {
			if (localKey.toLowerCase().startsWith(filename)) {
				var wordString = localStorage.getItem(localKey)
				var linkAddress = prefix + 'wordscape.html?' + getCompressToEncodedURI(wordString)
				var indexOfHyphen = localKey.lastIndexOf('-')
				if (indexOfHyphen > -1) {
					localKey = localKey.slice(0, indexOfHyphen).trim()
				}
				links.push('<li>\n<a href="' + linkAddress + '">' + localKey + '</a>\n</li>')
				break
			}
		}
	}

	if (links.length > 0) {
		addOutputArea('<ul>\n' + links.join('\n') + '\n</ul>\n', 'Hypertext Link Section - ' + id)
	}
},

processStatement: function(registry, statement) {
	statement.tag = 'g'
	var id = statement.attributeMap.get('id')
	if (getBooleanByDefault('addTableOfContents', registry, statement, statement.tag, false) == true) {
		setButtonPair(addTableOfContents, 'Add Table of Contents', id, 'Add Table of Contents')
	}

	var collectionName = statement.attributeMap.get('collectArticles')
	if (collectionName != undefined) {
		var inputArea = setButtonPair(collectArticles, 'Collect Articles', id, 'Collect Articles - ' + collectionName)
		var shouldConvertElement = getBooleanByDefault('convertElement', registry, statement, statement.tag, false)
		var statementObject = {collectionName: collectionName.toLowerCase(), shouldConvertElement:shouldConvertElement}
		inputArea.statementObject = statementObject
	}

	if (getBooleanByDefault('convertToHTML', registry, statement, statement.tag, true) == true) {
		setButtonPair(convertToHTML, 'Convert To HTML', id, 'Convert To HTML')
	}

	var filenames = getSemicolonSeparatedStringsByValue(statement.attributeMap.get('filename'))
	var prefix = Value.getValueDefault(statement.attributeMap.get('prefix'), '')
	this.generateLinkList(filenames, id, prefix)
},

tag: 'hypertext'
}

var lineFormatProcessor = {
alterLines: function(lines) {
	var isLineFormat = false
	for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		var line = lines[lineIndex]
		var trimmedLine = line.trim()
		if (trimmedLine.length > 0) {
			var characterZero = trimmedLine[0]
			if (characterZero == '/' || characterZero == '}') {
				isLineFormat = false
			}
			if (characterZero == '<') {
				trimmedLine = trimmedLine.slice(1)
			}
			if (isLineFormat) {
				lines[lineIndex] = 'text display=none>' + line + '</>'
			}
			if (trimmedLine.startsWith('lineFormat')) {
				isLineFormat = true
			}
		}
	}
},

processStatement: function(registry, statement) {
	var tagValue = statement.attributeMap.get('tag')
	if (tagValue == undefined) {
		return
	}

	statement.tag = tagValue
	processStatementByTagMap(new Set(), registry, statement, gTagCenterMap)
},

tag: 'lineFormat'
}

function replaceRows(lines, registry, statement) {
	var endMinusLine = statement.endIndex - statement.lineIndex
	if (endMinusLine == 0) {
		var endLine = '}'
		if (registry.lines[statement.lineIndex].trim().startsWith('<')) {
			endLine = '</>'
		}
		lines.splice(statement.lineIndex + 1, 0, endLine)
	}

	lines.splice(statement.lineIndex + 1, endMinusLine - 1)
	Vector.spliceArray(lines, statement.lineIndex + 1, statement.rows)
	registry.lineUpdated = true
}

function setButtonPair(buttonFunction, buttonTitle, id, titleStart) {
	if (gLongWordSet == undefined) {
		gLongWordSet = new Set()
		var script = document.createElement('script')
		script.src = 'longwords.js'
		script.setAttribute('type', 'text/javascript')
		document.body.appendChild(script)
	}

	var inputAreaID = 'input_area_' + id + buttonTitle.replaceAll(' ', '_')
	var inputArea = document.getElementById(inputAreaID)
	if (inputArea != null) {
		return inputArea
	}

	addHeading(titleStart)
	inputArea = getNewTextArea(inputAreaID)
	var button = getNewButton(buttonFunction, buttonTitle)
	addHeading('')
	button.inputArea = inputArea
	button.outputArea = getNewTextArea('output_area_' + id)
	return inputArea
}

function setClosestStatementRecursively(closestDistanceStatement, depth, location, registry, statement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in getClosestStatementRecursively reached, no further statements will be searched.'
		warningByList([warningText, statement, gRecursionLimit])
		return
	}

	var distance = getDistanceSquaredToStatement(location, registry, statement)
	if (distance < closestDistanceStatement.distance) {
		closestDistanceStatement.distance = distance
		closestDistanceStatement.statement = statement
	}

	depth += 1
	if (getMeshByID(statement.attributeMap.get('id'), registry) == undefined) {
		for (var child of statement.children) {
			setClosestStatementRecursively(closestDistanceStatement, depth, location, registry, child)
		}
	}
}

function workMesh(registry, statement, propertyName) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has('work')) {
		return undefined
	}

	var work = attributeMap.get('work')
	if (work.startsWith("'") || work.startsWith('"')) {
		work = work.slice(1)
	}

	if (work.endsWith("'") || work.endsWith('"')) {
		work = work.slice(0, -1)
	}

	var workMesh = getMeshByID(work, registry)
	if (workMesh == undefined) {
		return undefined
	}

	if (workMesh[propertyName] == undefined) {
		return undefined
	}

	return workMesh[propertyName].toString()
}

var gAbstract = {
	initialize: function() {
		gParentFirstSet.add(this.tag)
	},
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		var attributeMap = statement.attributeMap
		MapKit.setMapDefault('font-weight', attributeMap, 'normal')
		MapKit.setMapDefault('skip2D', attributeMap, 'true')
		MapKit.setMapDefault('skip3D', attributeMap, 'true')
		MapKit.setMapDefault('style', attributeMap, 'fill:none;stroke:black;stroke-width:1')
		var flipY = getFloatByStatement('flipY', registry, statement)
		if (flipY != undefined) {
			scaleString = 'scale(' + flipY + ',' + (-flipY) + ')'
			attributeMap.set('transform', scaleString)
		}
		titleStrings = []
		var project = undefined
		if (attributeMap.has('project')) {
			project = attributeMap.get('project')
			if (project != 'untitled') {
				titleStrings.push(project)
				registry.dataMap.set('project', project)
			}
		}
		if (attributeMap.has('id')) {
			var abstractID = attributeMap.get('id')
			if (abstractID != 'untitled' && abstractID != 'abstract' && abstractID != project) {
				titleStrings.push(abstractID)
				registry.dataMap.set('abstractID', abstractID)
			}
		}
		if (attributeMap.has('date')) {
			var date = attributeMap.get('date')
			titleStrings.push(date)
			registry.dataMap.set('date', date)
		}
		gTitle = titleStrings.join(' - ')
		document.title = gTitle + ' - Wordscape'
		if (getAttributeValue('display', statement) == 'none') {
			registry.display = 'none'
		}
	},
	tag: 'abstract'
}

var gCopy = {
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		if (!attributeMap.has('work')) {
			printCaller(['No work attribute in copy in meta.', statement])
			return
		}

		var workID = attributeMap.get('work')
		if (!registry.idMap.has(workID)) {
			printCaller(['No work could be found for copy in meta.', workID, statement])
			return
		}

		var workStatement = registry.idMap.get(workID)
		var location = getFloatsByStatement('location', registry, statement)
		getMatrix2D(registry, statement)

		if (location != undefined) {
			var closestDistanceStatement = {distance:Number.MAX_VALUE, statement:null}
			setClosestStatementRecursively(closestDistanceStatement, 0, location, registry, workStatement)
			workStatement = closestDistanceStatement.statement
			if (workStatement == undefined) {
				printCaller(['No objects to find closest to location in copy in meta.', workStatement, statement])
				return
			}
		}

		if (statement.nestingIncrement == 0) {
			statement.nestingIncrement = workStatement.nestingIncrement
			statement.tag = workStatement.tag
			copyStatementRecursively(registry, statement, workStatement)
			return
		}

		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		var matrix3Ds = getMatrix3DsByChildren(statement.children, registry)
		if (Vector.isEmpty(matrix2Ds) && Vector.isEmpty(matrix3Ds)) {
			printCaller(['No matrix2D or matrix3D in gCopy', statement])
			return
		}

		statement.tag = 'g'
		for (var matrix2D of matrix2Ds) {
			var matrixStatement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, statement, workStatement.tag)
			getUniqueID(statement.attributeMap.get('id') + '_' + workStatement.attributeMap.get('id'), registry, matrixStatement)
			matrixStatement.attributeMap.set('transform', 'matrix(' + matrix2D.toString() + ')')
			copyStatementRecursively(registry, matrixStatement, workStatement)
		}

		for (var matrix3D of matrix3Ds) {
			var matrixStatement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, statement, workStatement.tag)
			getUniqueID(statement.attributeMap.get('id') + '_' + workStatement.attributeMap.get('id'), registry, matrixStatement)
			matrixStatement.attributeMap.set('transform3D', 'matrix(' + matrix3D.toString() + ')')
			copyStatementRecursively(registry, matrixStatement, workStatement)
		}
	},
	tag: 'copy'
}

var gCopyMesh = {
processStatement: function(registry, statement) {
	var workID = statement.attributeMap.get('work')
	if (!registry.idMap.has(workID)) {
		printCaller(['No work could be found for copyMesh in meta.', statement])
		return
	}

	var meshes = []
	var searchDepth = getIntByDefault('searchDepth', registry, statement, this.tag, gRecursionLimit)
	addMeshesRecursively(gRecursionLimit - searchDepth, meshes, registry, registry.idMap.get(workID))
	if (meshes.length == 0) {
		printCaller(['No meshes could be found for copyMesh in meta.', statement])
		return
	}

	var matrix3D = getChainMatrix3D(registry, statement)
	for (var mesh of meshes) {
		transform3DPoints(matrix3D, mesh.points)
	}

	var idStart = statement.attributeMap.get('id') + '_' + workID
	if (statement.nestingIncrement == 0) {
		if (meshes.length == 1) {
			statement.tag = 'mesh'
			analyzeOutputMesh(getMeshCopy(meshes[0]), registry, statement)
			return
		}
		convertToGroup(statement)
		addMeshesToGroupStatement(idStart, meshes, registry, statement)
		return
	}

	statement.tag = 'g'
	var matrix3Ds = getMatrix3DsByChildren(statement.children, registry)
	if (Vector.isEmpty(matrix3Ds)) {
		printCaller(['No matrix3D in gCopyMesh in meta.', statement])
		return
	}

	for (var matrix3D of matrix3Ds) {
		var matrixAttributeMap = new Map([['transform3D', 'matrix(' + matrix3D.toString() + ')']])
		MapKit.copyKeysExcept(matrixAttributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
		var matrixStatement = getStatementByParentTag(matrixAttributeMap, 0, statement, 'mesh')
		getUniqueID(idStart, registry, matrixStatement)
		if (meshes.length == 1) {
			analyzeOutputMesh(getMeshCopy(meshes[0]), registry, matrixStatement)
		}
		else {
			convertToGroup(matrixStatement)
			addMeshesToGroupStatement(matrixAttributeMap.get('id'), meshes, registry, matrixStatement)
		}
	}

	MapKit.deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
},

tag: 'copyMesh'
}

var gCopyPoints = {
	processStatement: function(registry, statement) {
		var workID = statement.attributeMap.get('work')
		if (!registry.idMap.has(workID)) {
			return
		}

		var workStatement = registry.idMap.get(workID)
		var pointsStatements = []
		addToTagStatementsRecursivelyByDepth(undefined, 0, 1, pointsStatements, registry, workStatement, 'polygon')
		addToTagStatementsRecursivelyByDepth(undefined, 0, 1, pointsStatements, registry, workStatement, 'polyline')
		if (Vector.isEmpty(pointsStatements)) {
			printCaller(['No points statements could be found for gCopyPoints in meta.', statement])
			return
		}

		var idStart = statement.attributeMap.get('id') + '_' + workID
		if (statement.nestingIncrement == 0) {
			if (pointsStatements.length == 1) {
				statement.tag = pointsStatements[0].statement.tag
				setPointsExcept(Polyline.copy(pointsStatements[0].points), registry, statement)
				return
			}
			convertToGroup(statement)
			addPointsToGroupStatement(idStart, pointsStatements, registry, statement)
			return
		}

		statement.tag = 'g'
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		if (Vector.isEmpty(matrix2Ds)) {
			printCaller(['No matrix2D in gCopyPoints in meta.', statement])
			return
		}

		for (var matrix2D of matrix2Ds) {
			var matrixAttributeMap = new Map([['transform', 'matrix(' + matrix2D.toString() + ')']])
			MapKit.copyKeysExcept(matrixAttributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
			var matrixStatement = getStatementByParentTag(matrixAttributeMap, 0, statement, pointsStatements[0].statement.tag)
			getUniqueID(idStart, registry, matrixStatement)
			if (pointsStatements.length == 1) {
				setPointsExcept(Polyline.copy(pointsStatements[0].points), registry, matrixStatement)
			}
			else {
				convertToGroup(matrixStatement)
				addPointsToGroupStatement(matrixAttributeMap.get('id'), pointsStatements, registry, matrixStatement)
			}
		}

		MapKit.deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
	},
	tag: 'copyPoints'
}

var gDelete = {
	processStatement: function(registry, statement) {
		if (getBooleanByDefault('delete', registry, statement, this.tag, true)) {
			var workStatements = getWorkStatements(registry, statement)
			for (var workStatement of workStatements) {
				deleteStatement(workStatement)
			}
		}
	},
	tag: 'delete'
}

var gGroup = {
	initialize: function() {
		gTagCenterMap.set('g', this)
	},
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		getMatrix2D(registry, statement)
	},
	tag: 'group'
}

var gHelp = {
	processStatement: function(registry, statement) {
		console.log(getTagKeys())
	},

	tag: 'help'
}

var gMatrix2D = {
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var matrix2Ds = getMatrix2DsBySuffix(attributeMap, registry, statement, null)
		if (matrix2Ds.length == 0) {
			return
		}
		for (var depth = 1; depth < gRecursionLimit; depth++) {
			var depthTransform2Ds = getMatrix2DsBySuffix(attributeMap, registry, statement, '_' + depth.toString())
			if (depthTransform2Ds.length == 0) {
				break
			}
			else {
				var count = 0
				var newTransform2Ds = new Array(depthTransform2Ds.length * matrix2Ds.length)
				for (var depthTransform2D of depthTransform2Ds) {
					for (var matrix2D of matrix2Ds) {
						newTransform2Ds[count] = getMultiplied2DMatrix(depthTransform2D, matrix2D)
						count++
					}
				}
				matrix2Ds = newTransform2Ds
			}
		}
		attributeMap.set('matrix2D', matrix2Ds.join(' '))
	},
	tag: 'matrix2D'
}

var gMatrix3D = {
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var matrix3Ds = getMatrix3DsBySuffix(attributeMap, registry, statement, null)
		if (matrix3Ds.length == 0) {
			return
		}
		for (var depth = 1; depth < gRecursionLimit; depth++) {
			var depthMatrix3Ds = getMatrix3DsBySuffix(attributeMap, registry, statement, '_' + depth.toString())
			if (depthMatrix3Ds.length == 0) {
				break
			}
			else {
				var count = 0
				var newMatrix3Ds = new Array(depthMatrix3Ds.length * matrix3Ds.length)
				for (var depthMatrix3D of depthMatrix3Ds) {
					for (var matrix3D of matrix3Ds) {
						newMatrix3Ds[count] = getMultiplied3DMatrix(depthMatrix3D, matrix3D)
						count++
					}
				}
				matrix3Ds = newMatrix3Ds
			}
		}
		attributeMap.set('matrix3D', matrix3Ds.join(' '))
	},
	tag: 'matrix3D'
}

var gPolygonAnalysis = {
	alterMesh: function(mesh, registry, statement) {
		if (mesh == undefined) {
			return
		}
		var normal = getPoint3DByStatement('normal', registry, statement)
		var analysisStatement = getStatementByParentTag(getMeshAnalysis(mesh, normal), 0, statement, 'polygonAnalysis')
		setIDMapSet(statement.attributeMap.get('id') + '_polygonAnalysis', registry, analysisStatement)
	},
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == undefined) {
			printCaller(['No workMesh could be found for polygonAnalysis in meta.', statement])
			return
		}
		MapKit.copyMissingKeys(statement.attributeMap, getMeshAnalysis(workMesh, getPoint3DByStatement('normal', registry, statement)))
	},
	tag: 'polygonAnalysis'
}

var gProcess = {
	processStatement: function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				MapKit.copyKeysExcept(workStatement.attributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
				processStatementsByTagMap(new Set(), registry, getProcessableDescendantsInsideFirst(workStatement), gTagCenterMap)
			}
			return
		}

		printCaller(['No work attribute in process in meta.', statement])
	},
	tag: 'process'
}

var gSpreadsheet = {
addTextToSpreadsheet: function(delimiter, id, registry, statement) {
	if (statement.tag != 'text') {
		return
	}

	if (statement.attributeMap.get('display') == undefined) {
		statement.attributeMap.set('display', 'none')
	}

	var innerHTML = statement.attributeMap.get('innerHTML')
	if (innerHTML == undefined) {
		return
	}

	if (registry.spreadsheetMap == undefined) {
		registry.spreadsheetMap = new Map()
	}

	var rows = registry.spreadsheetMap.get(id, rows)
	if (rows == undefined) {
		rows = []
		registry.spreadsheetMap.set(id, rows)
	}

	var row = innerHTML.split(delimiter)
	if (row.filter(lengthCheck).length == 0) {
		row = []
	}

	rows.push(row)
},

processStatement: function(registry, statement) {
	convertToGroupIfParent(statement)
	var id = statement.attributeMap.get('id')
	var delimiter = getSpreadsheetDelimiter(statement)
	for (var child of statement.children) {
		this.addTextToSpreadsheet(delimiter, id, registry, child)
	}
},

tag: 'spreadsheet'
}

var gSTL = {
alterMesh: function(mesh, registry, statement) {
	addOutputArea(getSTLMeshString(mesh.id, mesh), 'STL - ' + mesh.id)
},

processStatement: function(registry, statement) {
	var workMeshes = getWorkMeshes(registry, statement)
	if (workMeshes.length > 0) {
		for (var workMesh of workMeshes) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(workMesh, registry, statement)
		}
		return
	}

	printCaller(['No workMesh could be found for stl in meta.', statement])
},

tag: 'stl'
}

var gSTLInput = {
	processStatement: function(registry, statement) {
		var id = statement.attributeMap.get('id')
		var stlInputArea = getInputArea('STL - ' + id)
		addMeshToStatement(stlInputArea, getMeshBySTL(id, stlInputArea.value), registry, statement)
	},
	tag: 'stlInput'
}

var gString = {
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var variableMap = getVariableMapByStatement(statement.parent)
		for (var key of attributeMap.keys()) {
			if (key != 'id') {
				variableMap.set(key, attributeMap.get(key))
			}
		}
	},
	tag: 'string'
}

var gTriangleAnalysis = {
	alterMesh: function(mesh, registry, statement) {
		var normal = getPoint3DByStatement('normal', registry, statement)
		var analysisStatement = getStatementByParentTag(getMeshAnalysis(getTriangleMesh(mesh), normal), 0, statement, 'triangleAnalysis')
		setIDMapSet(statement.attributeMap.get('id') + '_triangleAnalysis', registry, analysisStatement)
	},
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)

		if (workMesh == undefined) {
			printCaller(['No workMesh could be found for triangleAnalysis in meta.', statement])
			return
		}
		workMesh = getTriangleMesh(workMesh)
		MapKit.copyMissingKeys(statement.attributeMap, getMeshAnalysis(workMesh, getPoint3DByStatement('normal', registry, statement)))
	},
	tag: 'triangleAnalysis'
}

var gTSV = {
	alterMesh: function(mesh, registry, statement) {
		var id = getOutputOrWorkOrID(statement.attributeMap)
		var date = MapKit.getUndefinedOrValue(registry.dataMap, 'date')
		addOutputArea(getTSVMeshString(date, id, mesh, MapKit.getUndefinedOrValue(registry.dataMap, 'project')), 'TSV - ' + id)
	},
	processStatement: function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)

		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		printCaller(['No workMesh could be found for tsv in meta.', statement])
	},
	tag: 'tsv'
}

var gTSVInput = {
	processStatement: function(registry, statement) {
		var id = statement.attributeMap.get('id')
		var tsvInputArea = getInputArea('TSV - ' + id)
		addMeshToStatement(tsvInputArea, getMeshByTSV(tsvInputArea.value), registry, statement)
	},
	tag: 'tsvInput'
}

var gVar = {
initialize: function() {
	addFunctionToMap(alongsFromToDistance, null)
	addFunctionToMap(arcBeforeFromTo, gMapR)
	addFunctionToMap(arcCenterRadius, null)
	addFunctionToMap(arcFromToAngle, gMapR)
	addFunctionToMap(arcFromToRadius, gMapR)
	addFunctionToMap(arcTo, gMapR)
	addFunctionToMap(arcToAngle, gMapR)
	addFunctionToMap(arcToRadius, gMapR)
	addFunctionToMap(arcWaveXFromToHeight, null)
	addFunctionToMap(arcYXFromToHeight, null)
	addFunctionToMap(attributeByIDKey, gMapRS)
	addFunctionToMap(border, gMapRS)
	addFunctionToMap(bracket, null)
	addFunctionToMap(ellipseFromToRadius, gMapR)
	addFunctionToMap(ellipseToRadius, gMapR)
	addFunctionToMap(floatByIDKey, gMapRS)
	addFunctionToMap(insetsHeightAngle, null)
	addFunctionsToMap([intervalFromToBetween, intervalsFromQuantityIncrement, intervalsFromToAlong], null)
	addFunctionsToMap([intervalsFromToBetween, intervalsFromToIncrement, intervalsFromToQuantity], null)
	addFunctionsToMap([lattice2D, latticePolygon], null)
	addFunctionToMap(joinPoints, gMapR)
	addFunctionToMap(mirror, gMapR)
	addFunctionsToMap([parabolaFromToQuantity, parabolaToQuantity], gMapR)
	addFunctionToMap(point, gMapRS)
	addFunctionToMap(pointsByID, gMapRS)
	addFunctionToMap(rightByID, gMapRS)
	addFunctionsToMap([setAttributesArraysByID, setAttributeByID, setAttributesRowTable, setAttributesTableByID], gMapRS)
	addFunctionToMap(sineWaveXFromToCycles, null)
	addFunctionToMap(sineYXFromToCycles, null)
	addFunctionToMap(spiralBeforeFromTo, gMapR)
	addFunctionToMap(spiralCenterRadius, null)
	addFunctionToMap(spiralFromToAngle, gMapR)
	addFunctionToMap(spiralFromToRadius, gMapR)
	addFunctionToMap(spiralTo, gMapR)
	addFunctionToMap(spiralToAngle, gMapR)
	addFunctionToMap(spiralToRadius, gMapR)
	addFunctionsToMap([stepFromToBetween, stepFromToDistance, stepsFromQuantityIncrement], gMapR)
	addFunctionsToMap([stepsFromToAlong, stepsFromToBetween, stepsFromToQuantity, stepsQuantityIncrement], gMapR)
	addFunctionsToMap([stepsToAlong, stepsToBetween, stepsToQuantity, stepToBetween], gMapR)
	addFunctionToMap(stringLength, gMapRS)
	addFunctionToMap(topByID, gMapRS)
	addFunctionToMap(zigzag, null)
	addFunctionsToMap([zoomInterpolation, zoomInterpolation2D, zoomInterpolation3D], null)
	gFunctionMap.set('Array', getMapByVariableObject(Array))
	gFunctionMap.set('Date', getMapByVariableObject(Date))
	gFunctionMap.set('Dimension', getMapByVariableObject(Dimension))
	var mathMap = getMapByVariableObject(Math)
	gFunctionMap.set('Math', mathMap)
	mathMap.set('DegreesPerRadian', gDegreesPerRadian.toString())
	mathMap.set('DR', gDegreesPerRadian.toString())
	mathMap.set('RadiansPerDegree', gRadiansPerDegree.toString())
	mathMap.set('RD', gRadiansPerDegree.toString())
	mathMap.set('PI2', gPI2.toString())
	gFunctionMap.set('Number', getMapByVariableObject(Number))
	gFunctionMap.set('Polygon', getMapByVariableObject(Polygon))
	gFunctionMap.set('Polyline', getMapByVariableObject(Polyline))
	gFunctionMap.set('Science', getMapByVariableObject(Science))
	gFunctionMap.set('String', getMapByVariableObject(String))
	gFunctionMap.set('Value', getMapByVariableObject(Value))
	gFunctionMap.set('Vector', getMapByVariableObject(Vector))
},

processStatement: function(registry, statement) {
	var attributeMap = statement.attributeMap
	var variableMap = getVariableMapByStatement(statement.parent)
	for (var key of attributeMap.keys()) {
		if (key != 'id') {
			var variableString = attributeMap.get(key)
			if (isNaN(variableString)) {
				variableString = getString(getValueByEquation(registry, statement, variableString))
				attributeMap.set(key, variableString)
			}
			variableMap.set(key, variableString)
		}
	}
},

tag: 'var'
}

var gVarAnalysis = {
	processStatement: function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length == 0) {
			var parent = statement
			for (var whileCount = 0; whileCount < gLengthLimit; whileCount++) {
				if (parent.parent == undefined) {
					break
				}
				else {
					parent = parent.parent
				}
			}
			workStatements = [parent]
		}

		var descendantSet = new Set()
		for (var workStatement of workStatements) {
			SetKit.addElementsToSet(descendantSet, getProcessableDescendantsInsideFirst(workStatement))
		}

		var variableMap = new Map()
		for (var descendant of descendantSet) {
			if (descendant.variableMap != undefined) {
				for (var key of descendant.variableMap.keys()) {
					if (!key.startsWith('_')) {
						variableMap.set(key, descendant.variableMap.get(key))
					}
				}
			}
		}

		if (getBooleanByDefault('all', registry, statement, this.tag, false)) {
			var allVariables = []
			for (var entry of variableMap.entries()) {
				allVariables.push(entry)
			}
			allVariables.sort(Vector.compareStringZeroAscending)
			statement.attributeMap.set('allVariables', allVariables.join(' ').toString())
		}

		if (getBooleanByDefault('unused', registry, statement, this.tag, true)) {
			var attributeString = getAttributeString(registry)
			var unusedVariables = []
			for (var key of variableMap.keys()) {
				if (attributeString.indexOf(key) == -1) {
					unusedVariables.push(key)
				}
			}
			statement.attributeMap.set('unusedVariables', unusedVariables.toString().replaceAll(',', ' '))
		}
	},
	tag: 'varAnalysis'
}

var gView = {
	alterMesh: function(mesh, registry, statement) {
		if (mesh != undefined) {
			addViewMesh(statement.attributeMap.get('id'), registry, statement)
		}
	},
	getPoints: function(points, registry, statement) {
		var analysisPoints = getAnalysisPoints(registry, statement)
		if (analysisPoints != undefined) {
			registry.views.push(new ViewPoints(analysisPoints, statement.attributeMap.get('id')))
		}

		return points
	},
	processStatement: function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length == 0) {
			printCaller(['No workStatements could be found for view in meta.', statement])
		}

		if (getBooleanByDefault('group', registry, statement, statement.tag, true)) {
			var analysisPointsArray = []
			for (var workStatement of workStatements) {
				var analysisPoints = getAnalysisPoints(registry, workStatement)
				if (analysisPoints != undefined) {
					analysisPointsArray.push(analysisPoints)
				}
			}
			if (analysisPointsArray.length == 0) {
				printCaller(['No analysisPoints could be found for view in meta.', statement])
				return
			}
			registry.views.push(new ViewGroup(analysisPointsArray, statement.attributeMap.get('id')))
			return
		}

		for (var workStatement of workStatements) {
			var workID = statement.attributeMap.get('work')
			var workMesh = getMeshByID(workID, registry)
			if (workMesh == undefined) {
				addViewPoints(workID, registry, statement)
			}
			else {
				addViewMesh(workID, registry, statement)
			}
		}
	},
	tag: 'view'
}

var gWindow = {
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		MapKit.setMapDefault('skip2D', statement.attributeMap, 'true')
		getMatrix2D(registry, statement)
	},
	tag: 'window'
}

var gMetaProcessors = [
	gAbstract, gCopy, gCopyMesh, gCopyPoints, gDelete, gGroup, gHelp, hypertextProcessor, lineFormatProcessor, gMatrix2D, gMatrix3D,
	gPolygonAnalysis, gProcess, gSpreadsheet, gSTLInput, gSTL, gString, gTriangleAnalysis, gTSV, gTSVInput, gVar, gVarAnalysis,
	gView, gWindow
]
