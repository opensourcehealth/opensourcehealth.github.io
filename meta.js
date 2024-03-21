//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gCopyIDMap = new Map()
const gCopyTypeSet = new Set(['copy','row'])
const gLowerCharacterSet = new Set('abcdefghijklmnopqrstuvwxyz_'.split(''))
const gIDSet = new Set(['id'])
const gIDTransformWork = ['id', 'transform', 'transform3D', 'work']
const gIDPointsTransformWorkSet = new Set(gIDTransformWork.concat(['points', 'pointsHD']))
const gDisplayIDTransformWorkSet = new Set(['display', 'process'].concat(gIDTransformWork))
var gCopyIDKeySet = new Set(['work'])
const gSetR = new Set(['r'])
const gSetS = new Set(['s'])
const gSetRS = new Set(['r', 's'])

function addCells(registry, statement) {
	convertToGroup(statement)
	var cellStrings = statement.attributeMap.get('cells').split(' ').filter(lengthCheck)
	for (var cellString of cellStrings) {
		var cells = cellString.split(',').filter(lengthCheck)
		if (cells.length > 0) {
			var groupStatement = statement
			if (cells.length > 1) {
				groupStatement = getStatementByParentTag(new Map(), 1, statement, 'g')
				getStatementID(registry, groupStatement)
			}
			for (var cell of cells) {
				if (registry.idMap.has(cell)) {
					var workStatement = registry.idMap.get(cell)
					var child = getStatementByParentTag(new Map(), workStatement.nestingIncrement, groupStatement, workStatement.tag)
					getStatementID(registry, child)
					copyStatementRecursively(registry, child, workStatement)
				}
			}
		}
	}
}

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

function addFunctionToMap(functionToAdd, optionSet, map) {
	var functionName = functionToAdd.name
	if (functionName.endsWith('_Check')) {
		functionName = functionName.slice(0, -6)
	}

	functionToAdd.optionSet = optionSet
	getValueDefault(map, gFunctionMap).set(functionName, functionToAdd)
}

function addFunctionsToMap(functionsToAdd, optionSet, map) {
	for (var functionToAdd of functionsToAdd) {
		addFunctionToMap(functionToAdd, optionSet, map)
	}
}

function addHeading(title) {
	var heading = document.createElement('H3')
	heading.appendChild(document.createTextNode(title))
	document.body.appendChild(heading)
}

function addLineToParent(registry, statement) {
	if (registry.spreadsheetMap == undefined) {
		registry.spreadsheetMap = new Map()
	}

	var parentID = statement.parent.attributeMap.get('id')
	var rows = registry.spreadsheetMap.get(parentID, rows)
	if (rows == undefined) {
		rows = []
		registry.spreadsheetMap.set(parentID, rows)
	}

	var line = statement.attributeMap.get('line')
	statement.attributeMap.set('line', line.replaceAll('<', '&lt;'))
	line = line.replaceAll('&lt;', '<')
	var row = line.split(getSpreadsheetDelimiter(statement.parent))
	if (row.filter(lengthCheck).length == 0) {
		row = []
	}

	rows.push(row)
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
		copyKeysExcept(meshStatement.attributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
		getUniqueID(idStart, registry, meshStatement)
		analyzeOutputMesh(getMeshCopy(mesh), registry, meshStatement)
	}

	deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
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
			var pointsString = getStringByArrays(mesh.points)
			addEntriesToStatementLine([['points', pointsString], ['facets', getStringByArrays(mesh.facets)]], registry, statement)
			inputArea.value = ''
		}
	}
	if (mesh != undefined) {
		analyzeOutputMesh(mesh, registry, statement)
	}
}

function addOutputArea(text, title) {
	if (getIsEmpty(text)) {
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
		copyKeysExcept(tagStatement.attributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
		getUniqueID(idStart, registry, tagStatement)
		setPointsExcept(getArraysCopy(pointsStatement.points), registry, tagStatement)
	}

	deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
}

function addStatementRecursively(depth, parent, registry, workStatement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in addStatementRecursively reached, no further statements will be added.'
		warningByList([warningText, parent, gRecursionLimit])
		return
	}

	if (gCopyTypeSet.has(workStatement.tag) && depth > 10) {
		noticeByList(['Will not add a copy type statement with depth > 10 in addStatementRecursively in meta.', statement, workStatement])
		return
	}

	var statement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, parent, workStatement.tag)
	var attributeMap = statement.attributeMap
	var workID = workStatement.attributeMap.get('id')
	gCopyIDMap.set(workID, getUniqueID(parent.attributeMap.get('id') + '_' + workID, registry, statement))
	copyMissingKeysExcept(attributeMap, workStatement.attributeMap, gIDSet)
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

function copyStatementRecursively(registry, statement, workStatement) {
	if (gCopyTypeSet.has(workStatement.tag)) {
		noticeByList(['Will not copy a copy type statement in copyStatementRecursively in meta.', statement, workStatement])
		return
	}

	copyMissingKeysExcept(statement.attributeMap, workStatement.attributeMap, gDisplayIDTransformWorkSet)
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
	if (getIsEmpty(points)) {
		return Number.MAX_VALUE
	}
	var closestDistanceSquared = Number.MAX_VALUE
	for (var point of points) {
		var distanceSquared = distanceSquaredArray(location, point, 3)
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
				noticeByList(['Infinitely nested bounding box in getGroupBoundingBoxByArguments in function.', id, statement])
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
		if (gLowerCharacterSet.has(propertyName[0])) {
			map.set(propertyName, variableObject[propertyName])
			variableObject[propertyName].optionSet = undefined
		}
		else {
			map.set(propertyName, variableObject[propertyName].toString())
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
			polygon = getPushArray(polygon, workPoints)
		}
		else {
			if (workStatement.tag == 'polyline') {
				polyline = getPushArray(polygon, workPoints)
			}
		}
	}

	var suffixedScalePortion = getSuffixedString('scalePortion', suffix)
	var scalePortion = getFloatsByStatement(suffixedScalePortion, registry, statement)
	if (!getIsEmpty(scalePortion)) {
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
		if (!getIsEmpty(scale)) {
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
			polygon = getPushArray(polygon, workPoints)
		}
		else {
			if (workStatement.tag == 'polyline') {
				polyline= getPushArray(polygon, workPoints)
			}
		}
	}

	var suffixedScalePortion = getSuffixedString('scalePortion', suffix)
	var scalePortion = getFloatsByStatement(suffixedScalePortion, registry, statement)
	if (!getIsEmpty(scalePortion)) {
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
		if (!getIsEmpty(scale)) {
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

function getNewTextArea(textAreaID) {
	textArea = document.createElement('textarea')
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
	
function convertToHTML(click) {
	var button = click.explicitOriginalTarget
	var text = button.inputArea.value
	if (text.trim().length == 0) {
		return
	}

	var endOfLine = getEndOfLine(text)
	var lines = text.split(endOfLine)
	var sectionLines = undefined
	var sections = []
	for (var line of lines) {
		if (line.trim().length == 0) {
			if (sectionLines != undefined) {
				sections.push(gHypertext.getHTMLSection(endOfLine, sectionLines, sectionLines.join(endOfLine)))
				sectionLines = undefined
			}
		}
		else {
			if (sectionLines == undefined) {
				sectionLines = [line]
			}
			else {
				sectionLines.push(line)
			}
		}
	}

	if (sectionLines != undefined) {
		sections.push(gHypertext.getHTMLSection(endOfLine, sectionLines, sectionLines.join(endOfLine)))
	}

	button.outputArea.value = sections.join(endOfLine + endOfLine)
}

function getNewButton(buttonFunction, textContent) {
	var button = document.createElement('button')
	button.onclick = buttonFunction
	button.textContent = textContent
	addHeading('')
	document.body.appendChild(button)
	return button
}

var gHypertext = {
	bibliographySynonyms: ['Authorities', 'AUTHORITIES', 'BIBLIOGRAPHY', 'REFERENCES'],
	getDegreeText: function(text) {
		return text.trim().replaceAll(' deg. ', '&deg;').replaceAll('°', '&deg;')
	},
	getHTMLApostropheTable: function(endOfLine, lines, text) {
		var tableLines = []
		for (var line of lines) {
			var line = line.trim()
			if (line.length > 0) {
				var words = line.split('`')
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

		tableLines.splice(0, 0, gHypertext.tableString)
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

		var prefix = '<h' + level + '>'
		var suffix = '</h' + level + '>'
		var body = words.join(' ').trim()
		if (body.startsWith('<h')) {
			prefix = ''
		}

		if (body.endsWith('>')) {
			suffix = ''
		}

		return prefix + body + suffix
	},
	getHTMLParagraph: function(endOfLine, lines, text) {
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
			return this.getHTMLHeading(endOfLine, 3, words) + endOfLine + endOfLine + this.getParagraphWithoutMultipleSpaces(text)
		}

		var firstPeriod = lineZero.indexOf('.')
		if (firstPeriod > 0) {
			var afterPeriod = lineZero.slice(firstPeriod + 1).trim()
			var words = lineZero.slice(0, firstPeriod).split(' ').filter(lengthCheck)
			var heading = this.getHTMLHeading(endOfLine, 3, words) + endOfLine + endOfLine
			var lastText = endOfLine + lines.slice(1).join(endOfLine)
			if (afterPeriod.startsWith('--')) {
				return heading + this.getParagraphWithoutMultipleSpaces(afterPeriod.slice(2).trim() + lastText)
			}
			if (afterPeriod.startsWith('—')) {
				return heading + this.getParagraphWithoutMultipleSpaces(afterPeriod.slice(1).trim() + lastText)
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
			return this.getHTMLHeading(endOfLine, 2, allCaps) + endOfLine + endOfLine + this.getParagraphWithoutMultipleSpaces(text)
		}

		return this.getParagraphWithoutMultipleSpaces(text)
	},
	getHTMLSection: function(endOfLine, lines, text) {
		for (var bibliographySynonym of gHypertext.bibliographySynonyms) {
			if (text.indexOf(bibliographySynonym) != -1) {
				return this.getHTMLBibliography(bibliographySynonym, endOfLine, text)
			}
		}

		if (lines.length == 1) {
			var words = lines[0].split(' ').filter(lengthCheck)
			if (words.length < 7) {
				return this.getHTMLHeading(endOfLine, 3, words)
			}
		}

		if (getCharacterCount(text, '|') * 2 > lines.length) {
			return this.getHTMLVerticalLineTable(endOfLine, lines, text)
		}

		if (getCharacterCount(text, '`') > lines.length) {
			return this.getHTMLApostropheTable(endOfLine, lines, text)
		}

		if (getCharacterVariance(text, ' ') > 2.0) {
			text = text.replaceAll('  ', '|')
			return this.getHTMLVerticalLineTable(endOfLine, text.split(endOfLine), text)
		}

		var blankSet = new Set([' ', endOfLine])
		var semicolonCapital = 0
		var wasSemicolon = false
		for (var character of text) {
			if (character == ';') {
				wasSemicolon = true
			}
			else {
				if (wasSemicolon) {
					if (!blankSet.has(character)) {
						semicolonCapital += 1 * gUpperCaseSet.has(character)
						wasSemicolon = false
					}
				}
			}
		}

		if (semicolonCapital * 2 > lines.length) {
			return this.getHTMLBibliography(undefined, endOfLine, text)
		}

		return this.getHTMLParagraph(endOfLine, lines, text)
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
	getParagraphWithoutMultipleSpaces: function(text) {
		var prefix = '<p>'
		var suffix = '</p>'
		var body = removeExtraSpaces(text).trim()
		var quoteModulo = 0
		var characters = body.split('')
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

		removeUndefineds(characters)
		body = characters.join('')
		if (body.startsWith('<p')) {
			prefix = ''
		}

		if (body.endsWith('>')) {
			suffix = ''
		}

		return prefix + body + suffix
	},
	lowerCaseSet: new Set('a an and at but for if in nor of on or so the to yet'.split(' ')),
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		this.setButtonPair(convertToHTML, 'Convert To HTML', statement.attributeMap.get('id'), 'Hypertext Input - ')
	},
	setButtonPair: function(buttonFunction, buttonTitle, id, titleStart) {
		var inputAreaID = 'input_area_' + id
		var inputArea = document.getElementById(inputAreaID)
		if (inputArea != null) {
			return
		}

		addHeading(titleStart + id)
		inputArea = getNewTextArea(inputAreaID)
		var button = getNewButton(buttonFunction, buttonTitle)
		addHeading('')
		button.inputArea = inputArea
		button.outputArea = getNewTextArea('output_area_' + id)
	},
	tableString: '<table style="border:1px solid black;border-spacing:20px 0px;margin:20px 10px;padding-bottom:10px;padding-top:10px">',
	tag: 'hypertext'
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
	spliceArray(lines, statement.lineIndex + 1, statement.rows)
	registry.lineUpdated = true
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
		gTagCenterMap.set(this.tag, this)
	},
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		var attributeMap = statement.attributeMap
		setMapDefault('font-weight', attributeMap, 'normal')
		setMapDefault('skip2D', attributeMap, 'true')
		setMapDefault('skip3D', attributeMap, 'true')
		setMapDefault('style', attributeMap, 'fill:none;stroke:black;stroke-width:1')
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
			noticeByList(['No work attribute in copy in meta.', statement])
			return
		}

		var workID = attributeMap.get('work')
		if (!registry.idMap.has(workID)) {
			noticeByList(['No work could be found for copy in meta.', workID, statement])
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
				noticeByList(['No objects to find closest to location in copy in meta.', workStatement, statement])
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
		if (getIsEmpty(matrix2Ds) && getIsEmpty(matrix3Ds)) {
			noticeByList(['No matrix2D or matrix3D in gCopy', statement])
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
			noticeByList(['No work could be found for copyMesh in meta.', statement])
			return
		}

		var meshes = []
		var searchDepth = getIntByDefault('searchDepth', registry, statement, this.tag, gRecursionLimit)
		addMeshesRecursively(gRecursionLimit - searchDepth, meshes, registry, registry.idMap.get(workID))
		if (meshes.length == 0) {
			noticeByList(['No meshes could be found for copyMesh in meta.', statement])
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
		if (getIsEmpty(matrix3Ds)) {
			noticeByList(['No matrix3D in gCopyMesh in meta.', statement])
			return
		}

		for (var matrix3D of matrix3Ds) {
			var matrixAttributeMap = new Map([['transform3D', 'matrix(' + matrix3D.toString() + ')']])
			copyKeysExcept(matrixAttributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
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

		deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
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
		if (getIsEmpty(pointsStatements)) {
			noticeByList(['No points statements could be found for gCopyPoints in meta.', statement])
			return
		}

		var idStart = statement.attributeMap.get('id') + '_' + workID
		if (statement.nestingIncrement == 0) {
			if (pointsStatements.length == 1) {
				statement.tag = pointsStatements[0].statement.tag
				setPointsExcept(getArraysCopy(pointsStatements[0].points), registry, statement)
				return
			}
			convertToGroup(statement)
			addPointsToGroupStatement(idStart, pointsStatements, registry, statement)
			return
		}

		statement.tag = 'g'
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		if (getIsEmpty(matrix2Ds)) {
			noticeByList(['No matrix2D in gCopyPoints in meta.', statement])
			return
		}

		for (var matrix2D of matrix2Ds) {
			var matrixAttributeMap = new Map([['transform', 'matrix(' + matrix2D.toString() + ')']])
			copyKeysExcept(matrixAttributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
			var matrixStatement = getStatementByParentTag(matrixAttributeMap, 0, statement, pointsStatements[0].statement.tag)
			getUniqueID(idStart, registry, matrixStatement)
			if (pointsStatements.length == 1) {
				setPointsExcept(getArraysCopy(pointsStatements[0].points), registry, matrixStatement)
			}
			else {
				convertToGroup(matrixStatement)
				addPointsToGroupStatement(matrixAttributeMap.get('id'), pointsStatements, registry, matrixStatement)
			}
		}

		deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
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
		gTagCenterMap.set(this.tag, this)
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
			noticeByList(['No workMesh could be found for polygonAnalysis in meta.', statement])
			return
		}
		copyMissingKeys(statement.attributeMap, getMeshAnalysis(workMesh, getPoint3DByStatement('normal', registry, statement)))
	},
	tag: 'polygonAnalysis'
}

var gProcess = {
	processStatement: function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				copyKeysExcept(workStatement.attributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
				processStatementsByTagMap(new Set(), registry, getProcessableDescendantsInsideFirst(workStatement), gTagCenterMap)
			}
			return
		}

		noticeByList(['No work attribute in process in meta.', statement])
	},
	tag: 'process'
}

var gRow = {
	processStatement: function(registry, statement) {
		if (statement.attributeMap.has('cells')) {
			addCells(registry, statement)
			return
		}

		if (statement.attributeMap.has('line')) {
			addLineToParent(registry, statement)
			return
		}

		noticeByList(['No line or cells could be found for row in meta.', statement])
	},
	tag: 'row'
}

var gSpreadsheet = {
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		var id = statement.attributeMap.get('id')
		var spreadsheetInputArea = getInputArea('Spreadsheet - ' + id)
		var text = spreadsheetInputArea.value
		var lines = []
		if (text.length > 0) {
			lines = text.split(getEndOfLine(text))
			for (var lineIndex = lines.length - 1; lineIndex > -1; lineIndex--) {
				if (lines[lineIndex].length == 0) {
					lines.length -= 1
				}
				else {
					break
				}
			}
		}
		if (lines.length == 0) {
			return
		}
		var delimiter = getSpreadsheetDelimiter(statement)
		var rows = new Array(lines.length)
		statement.rows = new Array(lines.length)
		for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			rows[lineIndex] = lines[lineIndex].split(delimiter)
			statement.rows[lineIndex] = 'row line=' + lines[lineIndex]
		}
		if (getBooleanByDefault('updateStatement', registry, statement, this.tag, false)) {
			if (registry.indexStatements == undefined) {
				registry.indexStatements = []
			}
			var indexStatement = [statement.lineIndex, statement]
			registry.indexStatements.push(indexStatement)
			spreadsheetInputArea.value = ''
			if (statement.nestingIncrement > 0) {
				statement.endIndex = statement.lineIndex + 1
				for (; statement.endIndex < registry.lines.length; statement.endIndex++) {
					var lineStatement = getStatement(registry.lines[statement.endIndex])
					if (lineStatement.nestingIncrement < 0) {
						break
					}
				}
			}
			else {
				statement.endIndex = statement.lineIndex
				var line = registry.lines[statement.lineIndex].trim()
				if (line.startsWith('<')) {
					if (line.endsWith('/>')) {
						registry.lines[statement.lineIndex] = line.slice(0, line.length - 2) + '>'
					}
				}
				else {
					registry.lines[statement.lineIndex] += ' {'
				}
				convertToGroup(statement)
			}
			var idStart = id + '_row_'
			statement.children.length = 0
			for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				var rowStatement = getStatementByParentTag(new Map([['line', lines[lineIndex]]]), 0, statement, 'row')
				getUniqueID(idStart + lineIndex.toString(), registry, rowStatement)
			}
		}
		if (registry.spreadsheetMap == undefined) {
			registry.spreadsheetMap = new Map()
		}
		registry.spreadsheetMap.set(id, rows)
	},
	tag: 'spreadsheet'
}

var gSTL = {
	alterMesh: function(mesh, registry, statement) {
		var id = getOutputOrWorkOrID(statement.attributeMap)
		addOutputArea(getSTLMeshString(id, mesh), 'STL - ' + id)
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
		noticeByList(['No workMesh could be found for stl in meta.', statement])
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
			noticeByList(['No workMesh could be found for triangleAnalysis in meta.', statement])
			return
		}
		workMesh = getTriangleMesh(workMesh)
		copyMissingKeys(statement.attributeMap, getMeshAnalysis(workMesh, getPoint3DByStatement('normal', registry, statement)))
	},
	tag: 'triangleAnalysis'
}

var gTSV = {
	alterMesh: function(mesh, registry, statement) {
		var id = getOutputOrWorkOrID(statement.attributeMap)
		var date = getUndefinedOrValue(registry.dataMap, 'date')
		addOutputArea(getTSVMeshString(date, id, mesh, getUndefinedOrValue(registry.dataMap, 'project')), 'TSV - ' + id)
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
		noticeByList(['No workMesh could be found for tsv in meta.', statement])
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
		gTagCenterMap.set(this.tag, this)
		addFunctionToMap(alongsFromToDistance, null)
		addFunctionToMap(arcBeforeFromTo, gSetR)
		addFunctionToMap(arcCenterRadius, null)
		addFunctionToMap(arcFromToAngle, gSetR)
		addFunctionToMap(arcFromToRadius, gSetR)
		addFunctionToMap(arcTo, gSetR)
		addFunctionToMap(arcToAngle, gSetR)
		addFunctionToMap(arcToRadius, gSetR)
		addFunctionToMap(arcWaveXFromToHeight, null)
		addFunctionToMap(arcYXFromToHeight, null)
		addFunctionToMap(attributeByIDKey, gSetRS)
		addFunctionToMap(border, gSetRS)
		addFunctionToMap(bracket, null)
		addFunctionToMap(ellipseFromToRadius, gSetR)
		addFunctionToMap(ellipseToRadius, gSetR)
		addFunctionToMap(floatByIDKey, gSetRS)
		addFunctionToMap(insetsHeightAngle, null)
		addFunctionsToMap([intervalFromToBetween, intervalsFromQuantityIncrement, intervalsFromToAlong], null)
		addFunctionsToMap([intervalsFromToBetween, intervalsFromToIncrement, intervalsFromToQuantity], null)
		addFunctionsToMap([lattice2D, latticePolygon], null)
		addFunctionToMap(joinPoints, gSetR)
		addFunctionToMap(mirror, gSetR)
		addFunctionsToMap([parabolaFromToQuantity, parabolaToQuantity], gSetR)
		addFunctionToMap(point, gSetRS)
		addFunctionToMap(pointsByID, gSetRS)
		addFunctionToMap(rightByID, gSetRS)
		addFunctionsToMap([setAttributesArraysByID, setAttributeByID, setAttributesRowTable, setAttributesTableByID], gSetRS)
		addFunctionToMap(sineWaveXFromToCycles, null)
		addFunctionToMap(sineYXFromToCycles, null)
		addFunctionToMap(spiralBeforeFromTo, gSetR)
		addFunctionToMap(spiralCenterRadius, null)
		addFunctionToMap(spiralFromToAngle, gSetR)
		addFunctionToMap(spiralFromToRadius, gSetR)
		addFunctionToMap(spiralTo, gSetR)
		addFunctionToMap(spiralToAngle, gSetR)
		addFunctionToMap(spiralToRadius, gSetR)
		addFunctionsToMap([stepFromToBetween, stepFromToDistance, stepsFromQuantityIncrement], gSetR)
		addFunctionsToMap([stepsFromToAlong, stepsFromToBetween, stepsFromToQuantity, stepsQuantityIncrement], gSetR)
		addFunctionsToMap([stepsToAlong, stepsToBetween, stepsToQuantity, stepToBetween], gSetR)
		addFunctionToMap(stringLength, gSetRS)
		addFunctionToMap(topByID, gSetRS)
		addFunctionToMap(zigzag, null)
		addFunctionsToMap([zoomInterpolation, zoomInterpolation2D, zoomInterpolation3D], null)
		gFunctionMap.set('Array', getMapByVariableObject(Array))
		gFunctionMap.set('Date', getMapByVariableObject(Date))
		var mathMap = getMapByVariableObject(Math)
		gFunctionMap.set('Math', mathMap)
		mathMap.set('DegreesPerRadian', gDegreesPerRadian.toString())
		mathMap.set('DR', gDegreesPerRadian.toString())
		mathMap.set('RadiansPerDegree', gRadiansPerDegree.toString())
		mathMap.set('RD', gRadiansPerDegree.toString())
		mathMap.set('PI2', gPI2.toString())
		gFunctionMap.set('Number', getMapByVariableObject(Number))
		gFunctionMap.set('String', getMapByVariableObject(String))
		var vectorMap = getMapByVariableObject(Math)
		gFunctionMap.set('Vector', vectorMap)
		addFunctionsToMap([add2D_Check, add3D_Check, addArray_Check], null, vectorMap)
		addFunctionsToMap([additionInterpolation, additionInterpolation2D, additionInterpolation3D], null, vectorMap)
		addFunctionToMap(arrayAtIndex_Check, null, vectorMap)
		addFunctionsToMap([crossProduct_Check, crossProduct2D_Check], null, vectorMap)
		addFunctionsToMap([distance2D_Check, distanceSquared2D_Check, distance3D_Check, distanceSquared3D_Check], null, vectorMap)
		addFunctionsToMap([distanceArray_Check, distanceSquaredArray_Check], null, vectorMap)
		addFunctionsToMap([divide2D_Check, divide2DScalar_Check, divide3D_Check, divide3DScalar_Check], null, vectorMap)
		addFunctionsToMap([divideArray_Check, divideArrayScalar_Check], null, vectorMap)
		addFunctionsToMap([equal2D_Check, equal3D_Check, equalArray_Check], null, vectorMap)
		addFunctionsToMap([getAddition2D_Check, getAddition2Ds_Check, getAddition3D_Check, getAdditionArray_Check], null, vectorMap)
		addFunctionsToMap([getDivision2D_Check, getDivision2DScalar_Check], null, vectorMap)
		addFunctionsToMap([getDivision3D_Check, getDivision3DScalar_Check], null, vectorMap)
		addFunctionsToMap([getDivisionArray_Check, getDivisionArrayScalar_Check], null, vectorMap)
		addFunctionsToMap([getMultiplication2D_Check, getMultiplication2DScalar_Check], null, vectorMap)
		addFunctionsToMap([getMultiplication3D_Check, getMultiplication3DScalar_Check], null, vectorMap)
		addFunctionsToMap([getMultiplicationArray_Check, getMultiplicationArrayScalar_Check], null, vectorMap)
		addFunctionsToMap([getSubtraction2D_Check, getSubtraction3D_Check, getSubtractionArray_Check], null, vectorMap)
		addFunctionsToMap([length2D_Check, lengthSquared2D_Check, length3D_Check], null, vectorMap)
		addFunctionsToMap([lengthSquared3D_Check, lengthArray_Check, lengthSquaredArray_Check], null, vectorMap)
		addFunctionsToMap([multiply2D_Check, multiply2DScalar_Check, multiply3D_Check, multiply3DScalar_Check], null, vectorMap)
		addFunctionsToMap([multiplyArray_Check, multiplyArrayScalar_Check], null, vectorMap)
		addFunctionsToMap([oppositeHypoteneuseAdjacent_Check, oppositeHypoteneuseAdjacentSquared_Check], null, vectorMap)
		addFunctionToMap(polar_Check, null, vectorMap)
		addFunctionsToMap([reverseSigns_Check, rotate2DAngle_Check, rotate2DVector_Check, getRotation2DVector_Check], null, vectorMap)
		addFunctionsToMap([getRotation2DX_Check, getRotation2DY_Check], null, vectorMap)
		addFunctionsToMap([subtract2D_Check, subtract3D_Check, subtractArray_Check], null, vectorMap)
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
			addElementsToSet(descendantSet, getProcessableDescendantsInsideFirst(workStatement))
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
			allVariables.sort(compareStringZeroAscending)
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
			noticeByList(['No workStatements could be found for view in meta.', statement])
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
				noticeByList(['No analysisPoints could be found for view in meta.', statement])
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
		setMapDefault('skip2D', statement.attributeMap, 'true')
		getMatrix2D(registry, statement)
	},
	tag: 'window'
}

var gMetaProcessors = [
	gAbstract, gCopy, gCopyMesh, gCopyPoints, gDelete, gGroup, gHelp, gHypertext, gMatrix2D, gMatrix3D, gPolygonAnalysis,
	gProcess, gRow, gSpreadsheet, gSTLInput, gSTL, gString, gTriangleAnalysis, gTSV, gTSVInput, gVar, gVarAnalysis, gView, gWindow
]
