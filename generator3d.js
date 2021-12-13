//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFacetsAlongLoneEdges(facets) {
	var arrowMap = new Map()
	var arrowSet = new Set()
	for (var facet of facets) {
		addFacetToLoneArrowSet(0, facet, arrowSet)
	}
	for (var arrow of arrowSet) {
		var arrowStrings = arrow.split(' ')
		arrowMap.set(parseInt(arrowStrings[1]), parseInt(arrowStrings[0]))
	}
	addFacetsByIntegerArrowMap(arrowMap, facets)
}

function addFacetBetweenPolygons(arrowIndexSetMap, facets, pointIndexes, pointIndexStart, points, polygon3D) {
	for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
		var bottomLeftIndex = pointIndexStart + vertexIndex
		var bottomRightIndex = pointIndexStart + (vertexIndex + 1) % polygon3D.length
		var topLeftIndex = bottomLeftIndex + polygon3D.length
		var topRightIndex = bottomRightIndex + polygon3D.length
		var polygonFacet = [pointIndexes[bottomLeftIndex]]
		addToFacet(polygonFacet, pointIndexes[topLeftIndex])
		addToFacet(polygonFacet, pointIndexes[topRightIndex])
		var bottomRightPointIndex = pointIndexes[bottomRightIndex]
		if (polygonFacet[0] != bottomRightPointIndex) {
			addToFacet(polygonFacet, bottomRightPointIndex)
		}
		addToFacets(arrowIndexSetMap, facets, points, polygonFacet)
	}
}

function addFacetsByBottomTopFacet(bottomFacet, facets, topFacet) {
	for (var vertexIndex = 0; vertexIndex < bottomFacet.length; vertexIndex++) {
		var endIndex = (vertexIndex + 1) % bottomFacet.length
		facets.push([bottomFacet[endIndex], bottomFacet[vertexIndex], topFacet[vertexIndex], topFacet[endIndex]])
	}
}

function addFacetsByHorizontalFacets(facets, horizontalFacets) {
	facets.push(horizontalFacets[0])
	for (var horizontalFacetIndex = 0; horizontalFacetIndex < horizontalFacets.length - 1; horizontalFacetIndex++) {
		addFacetsByBottomTopFacet(horizontalFacets[horizontalFacetIndex], facets, horizontalFacets[horizontalFacetIndex + 1])
	}
	var topFacet = horizontalFacets[horizontalFacets.length - 1]
	topFacet.reverse()
	facets.push(topFacet)
}

function addFacetsByIntegerArrowMap(arrowMap, facets) {
	for (var key of arrowMap.keys()) {
		if (arrowMap.get(key) != null) {
			var facet = []
			while (facet.length < gLengthLimit) {
				var nextKey = arrowMap.get(key)
				if (nextKey == null) {
					facets.push(facet)
					break
				}
				else {
					facet.push(key)
					arrowMap.set(key, null)
					key = nextKey
				}
			}
		}
	}
	return facets
}

function addPolygon3DsToMesh(endFacets, facets, points, polygon3Ds) {
	var arrowIndexSetMap = new Map()
	var polygon3DLast = polygon3Ds.length - 1
	var pointIndexStarts = new Array(polygon3Ds.length)
	for (var polygon3DIndex = 0; polygon3DIndex < polygon3Ds.length; polygon3DIndex++) {
		pointIndexStarts[polygon3DIndex] = points.length
		pushArray(points, polygon3Ds[polygon3DIndex])
	}
	var pointIndexes = getPointIndexesPrunePoints(points)
	endFacets.push(linkFacetVertexes(pointIndexes, getPolygonFacet(pointIndexStarts[0], polygon3Ds[0])))
	for (var polygon3DIndex = 0; polygon3DIndex < polygon3DLast; polygon3DIndex++) {
		addFacetBetweenPolygons(arrowIndexSetMap, facets, pointIndexes, pointIndexStarts[polygon3DIndex], points, polygon3Ds[polygon3DIndex])
	}
	endFacets.push(linkFacetVertexes(pointIndexes, getPolygonFacet(pointIndexStarts[polygon3DLast], polygon3Ds[polygon3DLast]).reverse()))
	for (var facet of facets) {
		var indexEntries = []
		for (var vertexIndexIndex = 0; vertexIndexIndex < facet.length; vertexIndexIndex++) {
			var vertexIndex = facet[vertexIndexIndex]
			var nextIndexIndex = (vertexIndexIndex + 1) % facet.length
			var nextIndex = facet[nextIndexIndex]
			var arrow = vertexIndex.toString() + ' ' + nextIndex.toString()
			if (arrowIndexSetMap.has(arrow)) {
				indexEntries.push([vertexIndexIndex, arrowIndexSetMap.get(arrow)])
			}
		}
		if (indexEntries.length > 0) {
			for (var entryIndex = indexEntries.length - 1; entryIndex > -1; entryIndex--) {
				var indexEntry = indexEntries[entryIndex]
				facet.splice(indexEntry[0] + 1, 0, indexEntry[1])
			}
		}
	}
}

function addToFacet(polygonFacet, vertexIndex) {
	if (vertexIndex != polygonFacet[polygonFacet.length - 1]) {
		polygonFacet.push(vertexIndex)
	}
}

function addToFacets(arrowIndexSetMap, facets, points, polygonFacet) {
	if (polygonFacet.length < 3) {
		return
	}
	var concaveFacet = []
	const facetLengthMinus = polygonFacet.length - 1
	const facetLengthPlus = polygonFacet.length + 1
	for (var vertexIndex = 0; vertexIndex < polygonFacet.length; vertexIndex++) {
		var previousPointIndex = polygonFacet[(vertexIndex + facetLengthMinus) % polygonFacet.length]
		var previousPoint = points[previousPointIndex]
		var pointIndex = polygonFacet[vertexIndex]
		var point = points[pointIndex]
		var nextPointIndex = polygonFacet[(vertexIndex + facetLengthPlus) % polygonFacet.length]
		var nextPoint = points[nextPointIndex]
		var vectorA = getXYZSubtraction(previousPoint, point)
		var vectorB = getXYZSubtraction(nextPoint, point)
		var vectorALength = getXYZLength(vectorA)
		var vectorBLength = getXYZLength(vectorB)
		divideXYZByScalar(vectorA, vectorALength)
		divideXYZByScalar(vectorB, vectorBLength)
		if (getXYZDotProduct(vectorA, vectorB) > 0.9999999) {
			if (vectorALength > vectorBLength) {
				arrowIndexSetMap.set(pointIndex.toString() + ' ' + previousPointIndex.toString(), nextPointIndex)
			}
			else {
				arrowIndexSetMap.set(nextPointIndex.toString() + ' ' + pointIndex.toString(), previousPointIndex)
			}
		}
		else {
			concaveFacet.push(pointIndex)
		}
	}
	if (concaveFacet.length > 2) {
		facets.push(concaveFacet)
	}
}

function addToPillarMesh(heights, mesh, polygon3D) {
	var facets = mesh.facets
	var points = mesh.points
	var horizontalFacets = new Array(heights.length)
	var pointIndex = points.length
	points.length += polygon3D.length * heights.length
	for (var heightIndex = 0; heightIndex < heights.length; heightIndex++) {
		var height = heights[heightIndex]
		var horizontalFacet = new Array(polygon3D.length)
		for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
			var vertex = polygon3D[vertexIndex]
			points[pointIndex] = [vertex[0], vertex[1], vertex[2] + height]
			horizontalFacet[vertexIndex] = pointIndex
			pointIndex += 1
		}
		horizontalFacets[heightIndex] = horizontalFacet
	}
	addFacetsByHorizontalFacets(facets, horizontalFacets)
}

function addToWedgeMesh(heights, insets, mesh, polygon3D) {
	var facets = mesh.facets
	var points = mesh.points
	var horizontalFacets = new Array(heights.length)
	var pointIndex = points.length
	points.length += polygon3D.length * heights.length
	var insetIndex = 0
	var insetDirection = 1
	var heightLengthMinus = heights.length - 1
	if (heights[0] > heights[heightLengthMinus]) {
		insetIndex = heightLengthMinus
		insetDirection = -1
	}
	for (var heightIndex = 0; heightIndex < heights.length; heightIndex++) {
		var height = heights[heightIndex]
		var horizontalFacet = new Array(polygon3D.length)
		var insetPolygon = polygon3D
		if (insetIndex > 0) {
			insetPolygon = getInsetPolygon(getArraysMultiplicationByScalar(insets, 1.0 * insetIndex / heightLengthMinus), polygon3D)
		}
		for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
			points[pointIndex] = [insetPolygon[vertexIndex][0], insetPolygon[vertexIndex][1], polygon3D[vertexIndex][2] + height]
			horizontalFacet[vertexIndex] = pointIndex
			pointIndex += 1
		}
		horizontalFacets[heightIndex] = horizontalFacet
		insetIndex += insetDirection
	}
	addFacetsByHorizontalFacets(facets, horizontalFacets)
}

function getExtrusionMesh(isJoined, layers, transform3D) {
	if (layers.length == 0) {
		return null
	}
	if (layers[0].polygons.length == 0) {
		return null
	}
	var isClockwise = null
	var isUpsideDown = false
	var polygon3DLists = []
	for (var polygonIndex = 0; polygonIndex < layers[0].polygons.length; polygonIndex++) {
		polygon3DLists.push([])
	}
	for (var layerIndex = 0; layerIndex < layers.length; layerIndex++) {
		var layer = layers[layerIndex]
		var nextIndex = layerIndex + 1
		if (nextIndex < layers.length) {
			var nextLayer = layers[nextIndex]
			if (layer.polygons.length != nextLayer.polygons.length) {
				return null
			}
			for (var polygonIndex = 0; polygonIndex < layer.polygons.length; polygonIndex++) {
				if (layer.polygons[polygonIndex].length != nextLayer.polygons[polygonIndex].length) {
					return null
				}
			}
		}
		for (var polygonIndex = 0; polygonIndex < layer.polygons.length; polygonIndex++) {
			var polygon = layer.polygons[polygonIndex]
			if (isClockwise == null && polygon.length > 2) {
				isClockwise = getIsClockwise(polygon)
				isUpsideDown = layers[0].height > layers[layers.length - 1].height
				if (!isClockwise) {
					isUpsideDown = !isUpsideDown
				}
			}
			polygon3DLists[polygonIndex].push(getPolygon3D(polygon, layer.height))
		}
	}
	var facetsLayers = null
	var facets = []
	var points = []
	for (var polygon3Ds of polygon3DLists) {
		if (isUpsideDown) {
			polygon3Ds.reverse()
		}
		var endFacets = []
		addPolygon3DsToMesh(endFacets, facets, points, polygon3Ds)
		if (facetsLayers == null) {
			facetsLayers = Array(endFacets.length).fill(null)
		}
		for (var endFacetIndex = 0; endFacetIndex < endFacets.length; endFacetIndex++) {
			facetsLayers[endFacetIndex] = getPushElement(facetsLayers[endFacetIndex], endFacets[endFacetIndex])
		}
	}
	for (var facetsLayer of facetsLayers) {
		addInsideConnectedFacets(facetsLayer, facets, points)
	}
	return {facets:facets, points:points}
}

function getFacetConnections(gridMap, gridMultiplier, points, polynode, polynodeIndex, previousLayer) {
	var facetConnections = []
	if (gridMap != null) {
		for (var nodeIndex = 0; nodeIndex < polynode.length; nodeIndex++) {
			var topIndex = polynode[nodeIndex].pointIndex
			var closestPoint = getClosestPoint(gridMap, gridMultiplier, points[topIndex])
			var previousPolynode = previousLayer.polynodes[closestPoint[3]]
			facetConnections.push({bottomIndex:previousPolynode[closestPoint[2]].pointIndex, topIndex:topIndex})
		}
		return facetConnections
	}
	var vertexIndex = 0
	for (var nodeIndex = 0; nodeIndex < polynode.length; nodeIndex++) {
		if (!getIsEmpty(polynode[nodeIndex].connections)) {
			vertexIndex = nodeIndex
			break
		}
	}
	var indexEnd = polynode.length + vertexIndex
	for (var nodeIndex = vertexIndex; nodeIndex < indexEnd; nodeIndex++) {
		var node = polynode[nodeIndex % polynode.length]
		if(node.connections == null) {
			node.connections = [[vertexIndex]]
		}
		for (var connection of node.connections) {
			if (connection.length == 1) {
				connection.push(polynodeIndex)
			}
			var previousPolynode = previousLayer.polynodes[connection[1]]
			vertexIndex = (connection[0] + previousPolynode.length) % previousPolynode.length
			var facetConnection = {bottomIndex:previousPolynode[vertexIndex].pointIndex, topIndex:node.pointIndex}
			facetConnections.push(facetConnection)
			vertexIndex = (vertexIndex + 1) % previousPolynode.length
		}
	}
	return facetConnections
}

function getPillarMesh(polygons, heights, transform3D) {
	if (polygons.length == 0) {
		return null
	}
	var mesh = {facets:[], points:[]}
	for (var polygon of polygons) {
		if (polygon.length > 2) {
			var polygon3D = getPolygon3D(getDirectedPolygon(true, polygon), 0.0)
			addToPillarMesh(heights, mesh, polygon3D)
		}
	}
	return mesh
}

function getPolygon3D(polygon, z) {
	if (polygon.length == 0) {
		return polygon
	}
	if (polygon[0].length > 2) {
		return polygon
	}
	var polygon3D = new Array(polygon.length)
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var vertex = polygon[vertexIndex]
		polygon3D[vertexIndex] = [vertex[0], vertex[1], z]
	}
	return polygon3D
}

function getPolygonFacet(pointIndexStart, polygon3D) {
	var polygonFacet = new Array(polygon3D.length)
	for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
		polygonFacet[vertexIndex] = pointIndexStart
		pointIndexStart += 1
	}
	return polygonFacet
}

function getPolygonNodes(registry, statement) {
	var attributeMap = statement.attributeMap
	if (attributeMap == null) {
		return null
	}
	if (statement.tag != 'polygon') {
		return null
	}
	if (!attributeMap.has('nodes')) {
		if (attributeMap.has('points')) {
			attributeMap.set('nodes', attributeMap.get('points'))
		}
		else {
			return null
		}
	}
	var nodeWords = attributeMap.get('nodes').split(' ').filter(lengthCheck)
	if (nodeWords.length == 0) {
		return null
	}
	var oldPoint = []
	var nodes = new Array(nodeWords.length)
	var points = new Array(nodeWords.length)
	var pointWords = new Array(nodeWords.length)
	for (var nodeWordIndex = 0; nodeWordIndex < nodeWords.length; nodeWordIndex++) {
		var nodeSyllables = nodeWords[nodeWordIndex].split(';')
		var parameters = nodeSyllables[0].split(',')
		if (parameters.length == 1) {
			parameters.push(parameters[0])
		}
		for (var parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
			var parameter = parameters[parameterIndex]
			if (parameter.length > 0) {
				parameters[parameterIndex] = getFloatByEquationIfNaN(registry, statement, parameter)
			}
			else {
				if (oldPoint.length > parameterIndex) {
					parameters[parameterIndex] = oldPoint[parameterIndex]
				}
				else {
					parameters[parameterIndex] = 0.0
				}
			}
		}
		points[nodeWordIndex] = parameters
		var connections = null
		for (var syllableIndex = 1; syllableIndex < nodeSyllables.length; syllableIndex++) {
			if (connections == null) {
				connections = []
			}
			var nodeParameters = nodeSyllables[syllableIndex].split(',')
			for (var parameterIndex = 0; parameterIndex < nodeParameters.length; parameterIndex++) {
				var parameterString = nodeParameters[parameterIndex]
				if (parameterString.length == 0) {
					nodeParameters = null
					break
				}
				else {
					nodeParameters[parameterIndex] = getIntByEquationIfNaN(registry, statement, parameterString)
				}
			}
			if (nodeParameters != null) {
				connections.push(nodeParameters)
			}
		}
		var node = {connections:connections, point:parameters}
		nodes[nodeWordIndex] = node
		pointWords[nodeWordIndex] = [parameters[0].toString(), parameters[1].toString()]
		oldPoint = parameters
	}
	attributeMap.set('points', pointWords.join(' '))
	return nodes
}

function getScupltureMesh(layers, transform3D) {
	if (layers.length == 0) {
		return null
	}
	var facets = []
	var points = []
	var mesh = {facets:facets, points:points}
	var previousLayer = null
	for (var layer of layers) {
		var height = layer.height
		var pointIndexMap = new Map()
		for (var polynode of layer.polynodes) {
			for (var nodeIndex = 0; nodeIndex < polynode.length; nodeIndex++) {
				var node = polynode[nodeIndex]
				var point = node.point
				var pointZ = height
				if (point.length > 2) {
					pointZ += point[2]
				}
				node.point = [point[0], point[1], pointZ]
				var pointString = node.point.toString()
				if (pointIndexMap.has(pointString)) {
					node.pointIndex = pointIndexMap.get(pointString)
				}
				else {
					node.pointIndex = points.length
					pointIndexMap.set(pointString, points.length)
					points.push(node.point)
				}
			}
		}
		if (previousLayer != null) {
			var gridMap = null
			var gridMultiplier = null
			if (layer.connection == 'p') {
				gridMap = new Map()
				var previousPoints = []
				for (var polynodeIndex = 0; polynodeIndex < previousLayer.polynodes.length; polynodeIndex++) {
					var polynode = previousLayer.polynodes[polynodeIndex]
					for (var nodeIndex = 0; nodeIndex < polynode.length; nodeIndex++) {
						var nodePoint = polynode[nodeIndex].point
						previousPoints.push([nodePoint[0], nodePoint[1], nodeIndex, polynodeIndex])
					}
				}
				gridMultiplier = getGridMultiplier(gridMap, previousPoints)
			}
			for (var polynodeIndex = 0; polynodeIndex < layer.polynodes.length; polynodeIndex++) {
				var polynode = layer.polynodes[polynodeIndex]
				var facetConnections = getFacetConnections(gridMap, gridMultiplier, points, polynode, polynodeIndex, previousLayer)
				for (var connectionIndex = 0; connectionIndex < facetConnections.length; connectionIndex++) {
					var nextIndex = (connectionIndex + 1) % facetConnections.length
					var connection = facetConnections[connectionIndex]
					var nextConnection = facetConnections[nextIndex]
					var facet = [nextConnection.bottomIndex]
					if (connection.bottomIndex != nextConnection.bottomIndex) {
						facet.push(connection.bottomIndex)
					}
					facet.push(connection.topIndex)
					if (nextConnection.topIndex != connection.topIndex) {
						facet.push(nextConnection.topIndex)
					}
					if (facet.length > 2) {
						facets.push(facet)
					}
				}
			}
		}
		previousLayer = layer
	}
	addFacetsAlongLoneEdges(facets)
	removeTooThinFacets(mesh)
	triangulateBentFacets(mesh)
	return mesh
}

function getWedgeMesh(heights, insets, polygons, transform3D) {
	if (polygons.length == 0) {
		return null
	}
	var wedgeMesh = {facets:[], points:[]}
	for (var polygon of polygons) {
		if (polygon.length > 2) {
			var polygon3D = getPolygon3D(getDirectedPolygon(true, polygon), 0.0)
			addToWedgeMesh(heights, insets, wedgeMesh, polygon3D)
		}
	}
	return wedgeMesh
}

function linkFacetVertexes(pointIndexes, polygonFacet) {
	for (var vertexIndex = 0; vertexIndex < polygonFacet.length; vertexIndex++) {
		polygonFacet[vertexIndex] = pointIndexes[polygonFacet[vertexIndex]]
	}
	return polygonFacet
}

function removeClosePoints(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var linkMap = new Map()
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			var nextPointIndex = facet[(vertexIndex + 1) % facet.length]
			if (getArrayDistanceSquared(points[pointIndex], points[nextPointIndex]) < gCloseSquared) {
				addToLinkMap(pointIndex, nextPointIndex, linkMap)
			}
		}
	}
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			if (linkMap.has(pointIndex)) {
				facet[vertexIndex] = linkMap.get(pointIndex)
			}
		}
		removeRepeats(facet)
		if (facet.length < 3) {
			facets[facetIndex] = null
		}
	}
	removeNulls(facets)
}

function removeTooThinFacets(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	removeClosePoints(mesh)
	var segmentMap = new Map()
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			var point = points[pointIndex]
			for (var checkIndex = vertexIndex + 1; checkIndex < vertexIndex + facet.length - 1; checkIndex++) {
				var beginPointIndex = facet[checkIndex % facet.length]
				var endPointIndex = facet[(checkIndex + 1) % facet.length]
				if (getIsXYZSegmentClose(points[beginPointIndex], points[endPointIndex], point)) {
					addArrayElementToMap(pointIndex, getEdgeKey(beginPointIndex, endPointIndex), segmentMap)
				}
			}
		}
	}
	addPointsToFacets(mesh, segmentMap)
	for (var facetIndex = facets.length - 1; facetIndex > -1; facetIndex--) {
		var facet = facets[facetIndex]
		var vertexPointMap = new Map()
		var vertexes = []
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			if (vertexPointMap.has(pointIndex)) {
				vertexes.push(vertexPointMap.get(pointIndex))
				vertexes.push(vertexIndex)
			}
			else {
				vertexPointMap.set(pointIndex, vertexIndex)
			}
		}
		if (vertexes.length > 0) {
			vertexes.sort()
			var separateFacets = []
			for (var vertexIndex = 0; vertexIndex < vertexes.length; vertexIndex++) {
				var nextIndex = (vertexIndex + 1) % vertexes.length
				var vertex = vertexes[vertexIndex]
				var nextVertex = vertexes[nextIndex]
				var separateFacet = null
				if (nextVertex > vertex) {
					separateFacet = facet.slice(vertex, nextVertex)
				}
				else {
					separateFacet = facet.slice(vertex)
					pushArray(separateFacet, facet.slice(0, nextVertex))
				}
				if (separateFacet.length > 2) {
					separateFacets.push(separateFacet)
				}
			}
			if (separateFacets.length == 0) {
				facets.splice(facetIndex, 1)
			}
			else {
				facets[facetIndex] = separateFacets[0]
				for (var separateIndex = 1; separateIndex < separateFacets.length; separateIndex++) {
					facets.push(separateFacets[separateIndex])
				}
			}
		}
	}
}

function triangulateBentFacets(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var xyPoints = new Array(points.length)
	for (var facetIndex = facets.length - 1; facetIndex > -1; facetIndex--) {
		var facet = facets[facetIndex]
		if (facet.length > 3) {
			if (getNormalByFacetIfFlat(facet, points) == null) {
				var xyzTriangleFacets = getXYZTriangleFacets(facet, points, xyPoints)
				if (xyzTriangleFacets.length == 0) {
					facets.splice(facetIndex, 1)
				}
				else {
					facets[facetIndex] = xyzTriangleFacets[0]
					for (var remainingIndex = 1; remainingIndex < xyzTriangleFacets.length; remainingIndex++) {
						facets.push(xyzTriangleFacets[remainingIndex])
					}
				}
			}
		}
	}
}

var gExtrusion = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'extrusion',
	processStatement:function(registry, statement) {
		var heights = getHeights(registry, statement, this.name)
		var polygons = getPolygonsRecursively(registry, statement)
		var sections = [{layerIndex:0, polygons:polygons}]
		for (var child of statement.children) {
			if (child.tag == 'layer') {
				var layerIndex = sections[sections.length - 1].layerIndex + 1
				if (child.attributeMap.has('layerIndex')) {
					layerIndex = child.attributeMap.get('layerIndex')
				}
				sections.push({layerIndex:layerIndex, polygons:getPolygonsRecursively(registry, statement)})
			}
		}
		sections.reverse()
		var layers = []
		for (var heightIndex = 0; heightIndex < heights.length; heightIndex++) {
			if (sections.length > 0) {
				var lastSection = sections[sections.length - 1]
				if (lastSection.layerIndex == heightIndex) {
					polygons = lastSection.polygons
					sections.pop()
				}
			}
			layer = {height:heights[heightIndex], polygons:polygons, transform2D:null, transform3D:null}
			layers.push(layer)
		}
		var isJoined = false
		if (statement.attributeMap.has('join')) {
			if (statement.attributeMap.get('join').toLowerCase() == 'true') {
				isJoined = true
			}
		}
		var extrusion = new Extrusion(isJoined, layers, null)
		analyzeOutputMesh(extrusion, registry, statement)
	}
}

var gPillar = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'pillar',
	processStatement:function(registry, statement) {
		var heights = getHeights(registry, statement, this.name)
		var polygons = getPolygonsRecursively(registry, statement)
		var pillar = new Pillar(polygons, heights, null)
		analyzeOutputMesh(pillar, registry, statement)
	}
}

var gScuplture = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'scuplture',
	processStatement:function(registry, statement) {
		var connection = 's'
		var heights = getHeights(registry, statement, this.name)
		var layers = []
		for (var child of statement.children) {
			if (child.tag == 'layer') {
				if (layers.length >= heights.length) {
					break
				}
				var grandchildren = child.children
				var polynodes = []
				if (child.attributeMap.has('copy')) {
					var layerIndex = getIntByDefault(-1, 'copy', registry, child, this.name)
					if (layerIndex < 0) {
						layerIndex += layers.length
					}
					grandchildren = layers[layerIndex].statement.children
				}
				for (var grandchild of grandchildren) {
					var nodes = getPolygonNodes(registry, grandchild)
					if (nodes != null) {
						polynodes.push(nodes)
					}
				}
				if (child.attributeMap.has('connection')) {
					var connectionValue = child.attributeMap.get('connection')
					if (connectionValue.length > 0) {
						var firstLetter = connectionValue[0]
						if (firstLetter == 'l' || firstLetter == 'p' || firstLetter == 's') {
							connection = firstLetter
						}
					}
				}
				layers.push({
					connection:connection,
					height:heights[layers.length],
					polynodes:polynodes,
					statement:child,
					transform3D:null})
			}
		}
		var scuplture = new Scuplture(layers, null)
		analyzeOutputMesh(scuplture, registry, statement)
	}
}

var gWedge = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'wedge',
	processStatement:function(registry, statement) {
		var heights = getHeights(registry, statement, this.name)
		var insets = getInsets(registry, statement)
		var polygons = getPolygonsRecursively(registry, statement)
		var wedge = new Wedge(heights, insets, polygons, null)
		analyzeOutputMesh(wedge, registry, statement)
	}
}

function Extrusion(isJoined, layers, transform3D) {
	this.isJoined = isJoined
	this.layers = layers
	this.mesh = null
	this.transform3D = transform3D
	this.getMesh = function() {
		if (this.mesh == null) {
			this.mesh = getExtrusionMesh(isJoined, this.layers, this.transform3D)
		}
		return this.mesh
	}
}

function Mesh(mesh) {
	this.mesh = mesh
	this.getMesh = function() {
		return this.mesh
	}
}

function Pillar(polygons, heights, transform3D) {
	this.mesh = null
	this.polygons = polygons
	this.transform3D = transform3D
	this.heights = heights
	this.getMesh = function() {
		if (this.mesh == null) {
			this.mesh = getPillarMesh(this.polygons, this.heights, this.transform3D)
		}
		return this.mesh
	}
}

function Scuplture(layers, transform3D) {
	this.layers = layers
	this.mesh = null
	this.transform3D = transform3D
	this.getMesh = function() {
		if (this.mesh == null) {
			this.mesh = getScupltureMesh(this.layers, this.transform3D)
		}
		return this.mesh
	}
}

function Wedge(heights, insets, polygons, transform3D) {
	this.heights = heights
	this.insets = insets
	this.mesh = null
	this.polygons = polygons
	this.transform3D = transform3D
	this.getMesh = function() {
		if (this.mesh == null) {
			this.mesh = getWedgeMesh(this.heights, this.insets, this.polygons, this.transform3D)
		}
		return this.mesh
	}
}

var gGenerator3DProcessors = [gExtrusion, gPillar, gScuplture, gWedge]
