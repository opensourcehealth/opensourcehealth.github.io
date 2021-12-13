//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function getOutlines(isMarkerAbsolute, marker, outset, polylines) {
	var gridMap = new Map()
	if (outset.length == 1) {
		outset = [outset[0], outset[0]]
	}
	var outlines = []
	var nodes = []
	var points = []
	for (var polyline of polylines) {
		var previousIndex = null
		for (var point of polyline) {
			var pointIndex = getClosePointIndex(gridMap, point, points)
			if (pointIndex == nodes.length) {
				nodes.push([])
			}
			if (previousIndex != null) {
				nodes[previousIndex].push(pointIndex)
				nodes[pointIndex].push(previousIndex)
			}
			previousIndex = pointIndex
		}
	}
	for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
		var node = nodes[nodeIndex]
		if (node.length > 1) {
			var nodePoint = points[nodeIndex]
			var vectorZero = getXYSubtraction(points[node[0]], nodePoint)
			divideXYByScalar(vectorZero, getXYLength(vectorZero))
			for (var lineIndex = 1; lineIndex < node.length; lineIndex++) {
				var vector = getXYSubtraction(points[node[lineIndex]], nodePoint)
				divideXYByScalar(vector, getXYLength(vector))
				node[lineIndex] = [getDirectionalProximity(vectorZero, vector), node[lineIndex]]
			}
			node[0] = [1.0, node[0]]
			node.sort(compareFirstElementDescending)
			for (var lineIndex = 0; lineIndex < node.length; lineIndex++) {
				node[lineIndex] = node[lineIndex][1]
			}
		}
	}
	var arcMap = new Map()
	for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
		var node = nodes[nodeIndex]
		for (var lineIndex = 0; lineIndex < node.length; lineIndex++) {
			arcMap.set(node[(lineIndex - 0 + node.length) % node.length] + ' ' + nodeIndex, node[(lineIndex + 1 + node.length) % node.length])
		}
	}
	var nodeOutlines = []
	for (var key of arcMap.keys()) {
		var end = arcMap.get(key)
		if (end != null) {
			var nodeOutline = []
			do {
				nodeOutline.push(end)
				arcMap.set(key, null)
				key = key.split(' ')[1] + ' ' + end
				end = arcMap.get(key)
			}
			while (end != null)
			nodeOutlines.push(nodeOutline)
		}
	}
	var outlines = new Array(nodeOutlines.length)
	for (var nodeOutlineIndex = 0; nodeOutlineIndex < nodeOutlines.length; nodeOutlineIndex++) {
		var nodeOutline = nodeOutlines[nodeOutlineIndex]
		var outline = []
		for (var vertexIndex = 0; vertexIndex < nodeOutline.length; vertexIndex++) {
			var nodeIndex = nodeOutline[vertexIndex]
			var node = nodes[nodeIndex]
			var centerPoint = points[nodeIndex]
			var beginPoint = points[nodeOutline[(vertexIndex - 1 + nodeOutline.length) % nodeOutline.length]]
			var centerBegin = normalizeXY(getXYSubtraction(beginPoint, centerPoint))
			var endPoint = points[nodeOutline[(vertexIndex + 1) % nodeOutline.length]]
			var centerEnd = normalizeXY(getXYSubtraction(endPoint, centerPoint))
			if (node.length == 1) {
				var rightVector = [-centerEnd[1], centerEnd[0]]
				var rightOutsetVector = multiplyXY([-centerEnd[1], centerEnd[0]], outset)
				var rightOutsetDotProduct = getXYDotProduct(rightVector, rightOutsetVector)
				multiplyXYByScalar(rightVector, rightOutsetDotProduct)
				if (marker == null) {
					multiplyXYByScalar(centerEnd, rightOutsetDotProduct)
					var extendedEnd = getXYSubtraction(centerPoint, centerEnd)
					outline.push(getXYSubtraction(extendedEnd, rightVector))
					outline.push(getXYAddition(extendedEnd, rightVector))
				}
				else {
					outline.push(getXYSubtraction(centerPoint, rightVector))
					var markerRightVector = rightVector
					if (isMarkerAbsolute) {
						markerRightVector = getXYDivisionByScalar(markerRightVector, getXYLength(markerRightVector))
					}
					for (var vertex of marker) {
						outline.push(addXY(getXYRotation(vertex, markerRightVector), centerPoint))
					}
					outline.push(getXYAddition(centerPoint, rightVector))
				}
			}
			else {
				outline.push(getInsetPoint(centerEnd, centerPoint, centerBegin, outset))
			}
		}
		removeCollinearXYPoints(outline)
		outlines[nodeOutlineIndex] = outline
	}
	return outlines
}

var gOutline = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'outline',
	processStatement:function(registry, statement) {
		var polylines = getPointListsRecursivelyDelete('points', registry, statement, 'polyline')
		var polygons = getPointListsRecursivelyDelete('points', statement.children, registry, 'polygon')
		for (var polygon of polygons) {
			if (polygon.length > 0) {
				polygon.push(polygon[polygon.length - 1])
				polylines.push(polygon)
			}
		}
		var isMarkerAbsolute = getBooleanByDefault(true, 'markerAbsolute', registry, statement, this.name)
		var marker = getPointsByKey('marker', registry, statement)
		var outset = getFloatsByDefault([1.0], 'outset', registry, statement, this.name)
		var outlines = getOutlines(isMarkerAbsolute, marker, outset, polylines)
		statement.tag = 'g'
		if (!getIsEmpty(outlines)) {
			var exceptionSet = new Set(['markerAbsolute', 'marker', 'outset'])
			var idStart = statement.attributeMap.get('id') + '_polygon_'
			for (var outlineIndex = 0; outlineIndex < outlines.length; outlineIndex++) {
				var id = idStart + outlineIndex.toString()
				var polygonStatement = getStatementByException(exceptionSet, id, 'polygon', registry, statement)
				polygonStatement.attributeMap.set('points', outlines[outlineIndex].join(' '))
				gPolygon.processStatement(registry, polygonStatement)
			}
		}
	}
}

var gPolygon = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'polygon',
	processStatement:function(registry, statement) {
		var points = getPointsIncludingWork(registry, statement)
		if (points == null) {
			return
		}
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gPolyline = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'polyline',
	processStatement:function(registry, statement) {
		var points = getPointsIncludingWork(registry, statement)
		if (points == null) {
			return
		}
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gRectangle = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'rectangle',
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		statement.tag = 'polygon'
		var points = getPointsIncludingWork(registry, statement)
		if (points == null) {
			return
		}
		if (points.length == 1) {
			points.push([0.0, 0.0])
		}
		if (points.length == 2) {
			var minimumX = Math.min(points[0][0], points[1][0])
			var minimumY = Math.min(points[0][1], points[1][1])
			var maximumX = Math.max(points[0][0], points[1][0])
			var maximumY = Math.max(points[0][1], points[1][1])
			points = [[minimumX, minimumY], [minimumX, maximumY], [maximumX, maximumY], [maximumX, minimumY]]
		}
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gVerticalHole = {
	initialize: function() {
		addToCapitalizationMap('sagAngle')
		gTagCenterMap.set(this.name, this)
	},
	name: 'verticalHole',
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var overhangAngle = getFloatByDefault(40.0, 'overhangAngle', registry, statement, this.name) * gRadiansPerDegree
		cx = getFloatByDefault(0.0, 'cx', registry, statement, this.name)
		cy = getFloatByDefault(0.0, 'cy', registry, statement, this.name)
		radius = getFloatByDefault(1.0, 'r', registry, statement, this.name)
		sagAngle = getFloatByDefault(15.0, 'sagAngle', registry, statement, this.name) * gRadiansPerDegree
		sides = getFloatByDefault(24.0, 'sides', registry, statement, this.name)
		points = []
		beginAngle = Math.PI / 2.0 - overhangAngle
		endAngle = 1.5 * Math.PI + overhangAngle
		maximumIncrement = 2.0 * Math.PI / sides
		deltaAngle = endAngle - beginAngle
		arcSides = Math.ceil(deltaAngle / maximumIncrement - 0.001 * overhangAngle)
		angleIncrement = deltaAngle / arcSides
		halfAngleIncrement = 0.5 * angleIncrement
		beginAngle -= halfAngleIncrement
		endAngle += halfAngleIncrement + 0.001 * overhangAngle
		outerRadius = radius / Math.cos(0.5 * angleIncrement)
		for (pointAngle = beginAngle; pointAngle < endAngle; pointAngle += angleIncrement) {
			x = cx + Math.sin(pointAngle) * outerRadius
			y = cy + Math.cos(pointAngle) * outerRadius
			points.push([x, y])
		}
		topY = cy + radius
		deltaBegin = getXYSubtraction(points[0], points[1])
		sagRunOverRise = Math.cos(sagAngle) / Math.sin(sagAngle)
		segmentRunOverRise = deltaBegin[0] / deltaBegin[1]
		approachRunOverRise = sagRunOverRise - segmentRunOverRise
		topMinusSegment = topY - points[0][1]
		topX = topMinusSegment * segmentRunOverRise + points[0][0]
		aboveMinusTopY = (topX - cx) / approachRunOverRise
		sagDeltaX = aboveMinusTopY * sagRunOverRise
		aboveY = topY + aboveMinusTopY
		points[0] = [cx + sagDeltaX, aboveY]
		points[points.length - 1] = [cx - sagDeltaX, aboveY]
		for (pointIndex = 0; pointIndex < points.length; pointIndex++) {
			point = points[pointIndex]
			points[pointIndex] = [point[0].toFixed(3), point[1].toFixed(3)]
		}
		statement.tag = 'polygon'
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gGenerator2DProcessors = [gOutline, gPolygon, gPolyline, gRectangle, gVerticalHole]
