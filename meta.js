//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gAbstract = {
	name: 'abstract',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var floats = []
		if (attributeMap.has('flip')) {
			floats = getFloats(attributeMap.get('flip'))
		}
		else {
			if (attributeMap.has('flipY')) {
				floats = getFloats(attributeMap.get('flipY'))
			}
		}
		if (floats.length > 0) {
			scaleString = 'scale(' + floats[0] + ',' + (-floats[0]) + ')'
			attributeMap.set('transform', scaleString)
		}
		var styleMap = new Map([
			['fill', 'none'],
			['stroke', 'rgb(0,0,0)'],
			['stroke-width', '1']])
		if (attributeMap.has('style')) {
			styles = attributeMap.get('style').replace(/ /g, '').split(';')
			for (var style of styles) {
				var entry = style.split(':')
				styleMap.set(entry[0], entry[1])
			}
		}
		styles = []
		for (var entry of styleMap) {
			styles.push(entry[0] + ':' + entry[1])
		}
		attributeMap.set('style', styles.join(';'))
		titleStrings = []
		if (attributeMap.has('project')) {
			titleStrings.push(attributeMap.get('project'))
		}
		if (attributeMap.has('id')) {
			titleStrings.push(attributeMap.get('id'))
		}
		if (attributeMap.has('date')) {
			titleStrings.push(attributeMap.get('date'))
		}
		titleStrings.push('Wordscape')
		document.title = titleStrings.join(' - ')
	}
}

var gCopyLinear = {
	name: 'copyLinear',
	optionMap: null,
	processStatement:function(registry, statement) {
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement == null) {
			return
		}
		statement.tag = workStatement.tag
		var attributeMap = statement.attributeMap
		var points = getPolygonPoints(workStatement)
		if (points == null) {
			return
		}
		attributeMap.set('points', points.join(' '))
	}
}

var gCopyMesh = {
	name: 'copyMesh',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var workMesh = getWorkMesh(attributeMap, registry)
		if (workMesh != null) {
			analyzeOutputMesh(attributeMap, new Mesh(getMeshCopy(workMesh)), registry, statement)
		}
	}
}

var gDerive2D = {
	name: 'derive2D',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var transform2Ds = getPointsByKey('extraTransform2Ds', statement)
		if (transform2Ds == null) {
			transform2Ds = []
		}
		var planes = getPointsByKey('planes', statement)
		if (planes != null) {
			for (var plane of planes) {
				transform2Ds.push(get2DTransformByPlane(plane))
			}
			attributeMap.set('planes', planes.join(' '))
		}
		var polars = getPointsByKey('polars', statement)
		if (polars != null) {
			for (var polar of polars) {
				transform2Ds.push(get2DTransformByPolar(polar))
			}
			attributeMap.set('polars', polars.join(' '))
		}
		var workStatement = getWorkStatement(registry, statement)
		var workPoints = null
		if (workStatement != null) {
			workPoints = getPointsByKey('points', workStatement)
		}
		var polygon = getPointsByKey('polygon', statement)
		var polyline = getPointsByKey('polyline', statement)
		if (workPoints != null) {
			if (workStatement.tag == 'polygon') {
				if (polygon == null) {
					polygon = workPoints
				}
				else {
					pushArray(polygon, workPoints)
				}
			}
			else {
				if (workStatement.tag == 'polyline') {
					if (polyline == null) {
						polyline = workPoints
					}
					else {
						pushArray(polyline, workPoints)
					}
				}
			}
		}
		if (polygon != null) {
			for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
				transform2Ds.push(get2DTransformBySegment(polygon[pointIndex], polygon[(pointIndex + 1) % polygon.length]))
			}
		}
		if (polyline != null) {
			for (var pointIndex = 0; pointIndex < polyline.length - 1; pointIndex++) {
				transform2Ds.push(get2DTransformBySegment(polyline[pointIndex], polyline[pointIndex + 1]))
			}
		}
		var scale = getFloatsByStatement('scale', registry, statement)
		if (transform2Ds.length > 0) {
			if (!getIsEmpty(scale)) {
				if (scale.length == 1) {
					scale.push(scale[0])
				}
				for (var transform2D of transform2Ds) {
					var lengthX = Math.sqrt(transform2D[0] * transform2D[0] + transform2D[2] * transform2D[2])
					if (lengthX != 0.0) {
						lengthX /= scale[0]
						transform2D[0] /= lengthX
						transform2D[2] /= lengthX
					}
					var lengthY = Math.sqrt(transform2D[1] * transform2D[1] + transform2D[3] * transform2D[3])
					if (lengthY != 0.0) {
						lengthY /= scale[1]
						transform2D[1] /= lengthY
						transform2D[3] /= lengthY
					}
				}
			}
			attributeMap.set('transform2Ds', transform2Ds.join(' '))
		}
	}
}

var gGroup = {
	name: 'group',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var boundingBox = getGroupBoundingBox(statement, statement)
		var height = boundingBox[1][1]
		var width = boundingBox[1][0]
		var border = 0
		if (attributeMap.has('transform')) {
			var transform = attributeMap.get('transform')
			var entry = getBracketedEntry(transform)
			if (entry != null) {
				if (entry[0] == 'translate') {
					commaSeparated = entry[1].split(',')
					var xString = commaSeparated[0]
					var groupStorage = null
					if (registry.storageMap.has('group')) {
						groupStorage = registry.storageMap.get('group')
						xString = xString.replace('border', groupStorage.border.toString())
						xString = getIDReplaced(xString, groupStorage.border + groupStorage.border, groupStorage.widthMap, 'width')
					}
					xString = xString.replace('width', (width + 1).toFixed(0))
					var addition = getAddition(xString)
					if (groupStorage == null) {
						border = addition
					}
					xString = addition.toFixed(0)
					if (commaSeparated.length > 1) {
						yString = commaSeparated[1]
						if (groupStorage != null) {
							yString = getIDReplaced(yString, groupStorage.border, groupStorage.heightMap, 'height')
						}
						yString = yString.replace('height', (height + 1).toFixed(0))
						xString = xString + ',' + getAddition(yString).toFixed(0)
					}
					attributeMap.set('transform', 'translate(' + xString + ')')
				}
			}
		}
		groupStorage = null
		if (registry.storageMap.has('group')) {
			groupStorage = registry.storageMap.get('group')
		}
		else {
			var scaledBorder = border * getTransformed2DMatrix(null, statement)[0]
			groupStorage = {border:border, heightMap:new Map(), scaledBorder:scaledBorder, widthMap:new Map()}
			registry.storageMap.set('group', groupStorage)
		}
		if (attributeMap.has('id')) {
			var id = attributeMap.get('id')
			groupStorage.heightMap.set(id, height)
			groupStorage.widthMap.set(id, width)
		}
	}
}

var gVariable = {
	name: 'variable',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		for (var key of attributeMap.keys()) {
			if (key != 'id') {
				statement.parent.variableMap.set(key, attributeMap.get(key))
			}
		}
			console.log('statement.parent.variableMap')
			console.log(statement.parent.variableMap)
	}
}

var gMetaProcessors = [gAbstract, gCopyLinear, gCopyMesh, gDerive2D, gGroup, gVariable]
