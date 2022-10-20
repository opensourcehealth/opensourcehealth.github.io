//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addArrowMapToHorizontalFacets(aboveIndex, arrowMaps, pointLayerMap, points) {
	var startMap = arrowMaps[aboveIndex]
	for (var key of startMap.keys()) {
		if (startMap.get(key) != null) {
			var facet = []
			var pathIndex = aboveIndex
			var pathKey = key
			var pathMap = startMap
			while (facet.length < gLengthLimit) {
				nextKey = pathMap.get(pathKey)
				if (nextKey == null) {
					var layer = pointLayerMap.get(facet[0]).horizontalFacets.push(facet)
					break
				}
				else {
					facet.push(pathKey)
					pathMap.set(pathKey, null)
					pathKey = nextKey
				}
				var alternateIndex = 1 - pathIndex
				if (arrowMaps[alternateIndex].has(pathKey)) {
					pathIndex = alternateIndex
					pathMap = arrowMaps[alternateIndex]
				}


			}
		}
	}
}

function addFacetsAlongLoneEdges(facets, layers, pointLayerMap, points) {
	var arrowMaps = [new Map(), new Map()]
	var arrowSet = new Set()
	for (var facet of facets) {
		addFacetToLoneArrowSet(0, facet, arrowSet)
	}
	for (var facet of facets) {
		var lowIndex = Number.MAX_VALUE
		var highIndex = -Number.MAX_VALUE
		for (var pointIndex of facet) {
			var layerIndex = pointLayerMap.get(pointIndex).index
			lowIndex = Math.min(lowIndex, layerIndex)
			highIndex = Math.max(highIndex, layerIndex)
		}
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			var nextPointIndex = facet[(vertexIndex + 1) % facet.length]
			if (arrowSet.has(pointIndex.toString() + ' ' + nextPointIndex.toString())) {
				if (pointLayerMap.get(pointIndex).index == lowIndex) {
					arrowMaps[0].set(nextPointIndex, pointIndex)
				}
				else {
					arrowMaps[1].set(nextPointIndex, pointIndex)
				}
			}
		}
	}
	addArrowMapToHorizontalFacets(0, arrowMaps, pointLayerMap, points)
	addArrowMapToHorizontalFacets(1, arrowMaps, pointLayerMap, points)
	for (var layer of layers) {
		var facetGroups = getFacetGroups(layer.horizontalFacets, points)
		for (var facetGroup of facetGroups) {
			facets.push(getConnectedFacet(facetGroup, points))
		}
	}
	return facets
}

function addFacetsByBottomTopFacet(bottomFacet, facets, topFacet) {
	for (var vertexIndex = 0; vertexIndex < bottomFacet.length; vertexIndex++) {
		var endIndex = (vertexIndex + 1) % bottomFacet.length
		facets.push([bottomFacet[endIndex], bottomFacet[vertexIndex], topFacet[vertexIndex], topFacet[endIndex]])
	}
}

function addFacetsByHorizontalGroup(facets, horizontalFacetsGroup, points) {
	var horizontalFacetsZero = horizontalFacetsGroup[0]
	var bottomFacet = horizontalFacetsZero[0]
	var topFacet = horizontalFacetsZero[horizontalFacetsZero.length - 1]
	if (horizontalFacetsGroup.length > 1) {
		var pointMap = new Map()
		var bottomFacets = new Array(horizontalFacetsGroup.length)
		for (var horizontalIndex = 0; horizontalIndex < horizontalFacetsGroup.length; horizontalIndex++) {
			var horizontalFacets = horizontalFacetsGroup[horizontalIndex]
			var horizontalBottomFacet = horizontalFacets[0]
			bottomFacets[horizontalIndex] = horizontalBottomFacet
			for (var vertexIndex = 0; vertexIndex < horizontalBottomFacet.length; vertexIndex++) {
				pointMap.set(horizontalBottomFacet[vertexIndex], horizontalFacets[horizontalFacets.length - 1][vertexIndex])
			}
		}
		bottomFacet = getConnectedFacet(bottomFacets, points)
		topFacet = new Array(bottomFacet.length)
		var vertexIndex = 0
		for (var pointIndex of bottomFacet) {
			topFacet[vertexIndex] = pointMap.get(pointIndex)
			vertexIndex += 1
		}
	}
	facets.push(bottomFacet)
	for (var horizontalFacets of horizontalFacetsGroup) {
		for (var horizontalFacetIndex = 0; horizontalFacetIndex < horizontalFacets.length - 1; horizontalFacetIndex++) {
			addFacetsByBottomTopFacet(horizontalFacets[horizontalFacetIndex], facets, horizontalFacets[horizontalFacetIndex + 1])
		}
	}
	topFacet.reverse()
	facets.push(topFacet)
}

function addHolesToFacet(facetIndex, holePolygonLists, mesh) {
	var facet = mesh.facets[facetIndex]
	var points = mesh.points
	var polygon = getPolygonByFacet(facet, points)
	var isClockwise = getIsClockwise(polygon)
	var minimumX = polygon[0][0]
	var z = polygon[0][2]
	for (var polygonIndex = 1; polygonIndex < polygon.length; polygonIndex++) {
		minimumX = Math.min(minimumX, polygon[polygonIndex][0])
	}
	var pointIndex = points.length
	var holePolygons = holePolygonLists[Math.round(minimumX)]
	var holeFacets = new Array(holePolygons.length)
	for (var holeIndex = 0; holeIndex < holePolygons.length; holeIndex++) {
		var holePolygon = holePolygons[holeIndex]
		var holeFacet = new Array(holePolygon.length)
		points.length += holePolygon.length
		for (var vertexIndex = 0; vertexIndex < holePolygon.length; vertexIndex++) {
			holeFacet[vertexIndex] = pointIndex
			points[pointIndex] = [holePolygon[vertexIndex][0] + minimumX, holePolygon[vertexIndex][1], z]
			pointIndex += 1
		}
		if (isClockwise) {
			holeFacet.reverse()
		}
		holeFacets[holeIndex] = holeFacet
	}
	mesh.facets[facetIndex] = getConnectedFacet(pushArray([facet], holeFacets), points)
}

function addHolesToFence(bottoms, mesh, overhangAngle, thickness, tops, width) {
	var holePolygonLists = new Array(tops.length - 1)
	for (var topIndex = 0; topIndex < tops.length - 1; topIndex++) {
		var nextIndex = topIndex + 1
		var top = tops[topIndex]
		var nextTop = tops[nextIndex]
		var bottom = Math.max(bottoms[topIndex], bottoms[nextIndex])
		var outerTopRight = [distance2D(top, nextTop), Math.min(top[2], nextTop[2])]
		var innerLeft = thickness
		if (topIndex > 0) {
			innerLeft *= 0.5
		}
		var rightThickness = thickness
		if (topIndex < tops.length - 2) {
			rightThickness *= 0.5
		}
		var innerRight = outerTopRight[0] - rightThickness
		holePolygons = getHolePolygons(innerLeft, innerRight, bottom, outerTopRight, overhangAngle, thickness, width)
		var multiplier = [1.0 / outerTopRight[0], 1.0 / (outerTopRight[1] - bottom)]
		holePolygonLists[topIndex] = addArrayArraysByY(multiply2DArrays(holePolygons, multiplier), -bottom * multiplier[1])
	}
	var facetIndexes = getHorizontalFacetIndexes(mesh)
	for (var facetIndex of facetIndexes) {
		addHolesToFacet(facetIndex, holePolygonLists, mesh)
	}
}

function addToExtrusionMesh(isJoined, matrices, mesh, polygon3DGroup) {
	var facets = mesh.facets
	var points = mesh.points
	var pointIndex = points.length
	var horizontalFacetsGroup = new Array(polygon3DGroup.length)
	for (var polygon3DIndex = 0; polygon3DIndex < polygon3DGroup.length; polygon3DIndex++) {
		var polygon3D = polygon3DGroup[polygon3DIndex]
		var horizontalFacets = new Array(matrices.length)
		points.length += polygon3D.length * matrices.length
		for (var matrixIndex = 0; matrixIndex < matrices.length; matrixIndex++) {
			var horizontalFacet = new Array(polygon3D.length)
			var matrix = matrices[matrixIndex]
			for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
				points[pointIndex] = get3DBy3DMatrix(matrix, polygon3D[vertexIndex])
				horizontalFacet[vertexIndex] = pointIndex
				pointIndex += 1
			}
			horizontalFacets[matrixIndex] = horizontalFacet
		}
		horizontalFacetsGroup[polygon3DIndex] = horizontalFacets
	}
	addFacetsByHorizontalGroup(facets, horizontalFacetsGroup, points)
}

function addToPillarMesh(heights, mesh, polygon3DGroup) {
	var facets = mesh.facets
	var points = mesh.points
	var pointIndex = points.length
	var horizontalFacetsGroup = new Array(polygon3DGroup.length)
	for (var polygon3DIndex = 0; polygon3DIndex < polygon3DGroup.length; polygon3DIndex++) {
		var polygon3D = polygon3DGroup[polygon3DIndex]
		var horizontalFacets = new Array(heights.length)
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
		horizontalFacetsGroup[polygon3DIndex] = horizontalFacets
	}
	addFacetsByHorizontalGroup(facets, horizontalFacetsGroup, points)
}

function addToSlopedConnectionFacet(connectionFacet, oldTopFacets, point, points) {
	var closestIndex = null
	var closestTopFacetIndex = null
	var closestVertexIndex = null
	var leastDistanceSquared = Number.MAX_VALUE
	for (var topFacetIndex = 0; topFacetIndex < oldTopFacets.length; topFacetIndex++) {
		var topFacet = oldTopFacets[topFacetIndex]
		for (var vertexIndex = 0; vertexIndex < topFacet.length; vertexIndex++) {
			var pointIndex = topFacet[vertexIndex]
			var distanceSquared = distanceSquared2D(point, points[pointIndex])
			if (distanceSquared < leastDistanceSquared) {
				leastDistanceSquared = distanceSquared
				closestIndex = pointIndex
				closestTopFacetIndex = topFacetIndex
				closestVertexIndex = vertexIndex
			}
		}
	}
	if (closestTopFacetIndex == null) {
		return
	}
	connectionFacet.push({low:closestIndex, high:points.length, topFacetIndex:closestTopFacetIndex, vertexIndex:closestVertexIndex})
}

function addToVerticalConnectionFacet(connectionFacet, facets, oldArrowMap, oldGridMap, point, pointLayerMap, points, previousLayer) {
	var closestIndex = getClosePointIndexOrNull(oldGridMap, point, points)
	if (closestIndex == null) {
		for (var arrowKey of oldArrowMap.keys()) {
			var arrowString = arrowKey.split(' ')
			var beginIndex = parseInt(arrowString[0])
			var endIndex = parseInt(arrowString[1])
			if (getIsXYSegmentClose(points[beginIndex], points[endIndex], point)) {
				var lowPoint = [point[0], point[1], 0.0]
				var lowPointIndex = points.length
				pointLayerMap.set(lowPointIndex, previousLayer)
				previousLayer.pointIndexes.push(lowPointIndex)
				points.push(lowPoint)
				connectionFacet.push({low:lowPointIndex, high:points.length})
				var facetIndex = oldArrowMap.get(arrowKey)
				var facet = facets[facetIndex]
				oldArrowMap.delete(arrowKey)
				oldArrowMap.set(beginIndex.toString() + ' ' + lowPointIndex.toString(), facetIndex)
				oldArrowMap.set(lowPointIndex.toString() + ' ' + endIndex.toString(), facetIndex)
				for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
					if (facet[vertexIndex] == endIndex) {
						facet.splice(vertexIndex, 0, lowPointIndex)
						return
					}
				}
				return
			}
		}
		var lowPoint = [point[0], point[1], 0.0]
		pointLayerMap.set(points.length, previousLayer)
		previousLayer.pointIndexes.push(points.length)
		points.push(lowPoint)
		connectionFacet.push({low:points.length - 1, high:points.length})
		return
	}
	connectionFacet.push({low:closestIndex, high:points.length})
}

function convertPlankToRoad(betweens, centers, curve, matrix, mesh, registry, statement) {
	var top = mesh.points[0][2]
	//y>z -z>y
	for (var point of mesh.points) {
		top = Math.max(top, point[2])
		var y = point[1]
		point[1] = -point[2]
		point[2] = y
	}
	addSplitIndexes(statement.attributeMap.get('id'), betweens, mesh)
	//z>y -y>z
	for (var point of mesh.points) {
		var z = point[2]
		point[2] = -point[1]
		point[1] = z
	}
	if (getIsEmpty(centers)) {
		return mesh
	}
	var oldWidth = 1.0
	var oldAngle = 0.0
	for (var center of centers) {
		if (center.length < 4) {
			center.length = 4
		}
		if (center[2] == undefined) {
			center[2] = oldWidth
		}
		oldWidth = center[2]
		if (center[3] == undefined) {
			center[3] = oldAngle
		}
		else {
			center[3] = -Math.tan(center[3] * gRadiansPerDegree)
		}
		oldAngle = center[3]
	}
	var firstWidth = centers[0][2]
	var lefts = new Array(centers.length)
	var rights = new Array(centers.length)
	var centersLengthMinus = centers.length - 1
	var insetDeltas = new Array(centers.length)
	for (var vertexIndex = 1; vertexIndex < centersLengthMinus; vertexIndex++) {
		var centerPoint = centers[vertexIndex]
		var centerBegin = normalize2D(getSubtraction2D(centers[(vertexIndex - 1 + centers.length) % centers.length], centerPoint))
		var centerEnd = normalize2D(getSubtraction2D(centers[(vertexIndex + 1) % centers.length], centerPoint))
		insetDeltas[vertexIndex] = getInsetDelta(centerBegin, centerEnd)
	}
	var centerEnd = normalize2D(getSubtraction2D(centers[1], centers[0]))
	insetDeltas[0] = [centerEnd[1], -centerEnd[0]]
	var centerBegin = normalize2D(getSubtraction2D(centers[centersLengthMinus], centers[centers.length - 2]))
	insetDeltas[centersLengthMinus] = [centerBegin[1], -centerBegin[0]]
	for (var centerIndex = 0; centerIndex < centers.length; centerIndex++) {
		var center = centers[centerIndex]
		var insetRight = getMultiplication2DScalar(insetDeltas[centerIndex], 0.5 * center[2])
		lefts[centerIndex] = [center[0] - insetRight[0], center[1] - insetRight[1]]
		rights[centerIndex] = [center[0] + insetRight[0], center[1] + insetRight[1]]
	}
	var variableMap = getVariableMapByStatement(statement)
	for (var point of mesh.points) {
		var x = point[0]
		var xIndex = Math.floor(x)
		var left = lefts[xIndex]
		var right = rights[xIndex]
		var y = point[1]
		var oneMinusY = 1.0 - y
		var width = centers[xIndex][2]
		var halfWidth = 0.5 * width
		var aboveCenter = y - 0.5
		var deltaZ = aboveCenter * halfWidth * centers[xIndex][3]
		if (curve != null) {
			variableMap.set('y', (aboveCenter * firstWidth).toString())
			deltaZ += getValueByEquation(registry, statement, curve) * width / firstWidth
		}
		point[0] = oneMinusY * right[0] + y * left[0]
		point[1] = oneMinusY * right[1] + y * left[1]
		point[2] *= 1.0 + (deltaZ / top)
	}
	return mesh
}

function convertPlankToFence(betweens, bottoms, curve, matrix, mesh, registry, statement, tops) {
	var deltaZs = new Array(tops.length)
	tops = getPolygon3D(tops, 1.0)
	for (var topIndex = 0; topIndex < tops.length; topIndex++) {
		deltaZs[topIndex] = tops[topIndex][2] - bottoms[topIndex]
	}
	var deltaZeroZ = deltaZs[0]
	var insetDeltas = new Array(tops.length)
	var topsLengthMinus = tops.length - 1
	for (var vertexIndex = 1; vertexIndex < topsLengthMinus; vertexIndex++) {
		var centerPoint = tops[vertexIndex]
		var centerBegin = normalize2D(getSubtraction2D(tops[(vertexIndex - 1 + tops.length) % tops.length], centerPoint))
		var centerEnd = normalize2D(getSubtraction2D(tops[(vertexIndex + 1) % tops.length], centerPoint))
		insetDeltas[vertexIndex] = getInsetDelta(centerBegin, centerEnd)
	}
	var centerEnd = normalize2D(getSubtraction2D(tops[1], tops[0]))
	insetDeltas[0] = [centerEnd[1], -centerEnd[0]]
	var centerBegin = normalize2D(getSubtraction2D(tops[topsLengthMinus], tops[tops.length - 2]))
	insetDeltas[topsLengthMinus] = [centerBegin[1], -centerBegin[0]]
	//y>z -z>y
	for (var point of mesh.points) {
		var y = point[1]
		point[1] = -point[2]
		point[2] = y
	}
	addSplitIndexes(statement.attributeMap.get('id'), betweens, mesh)
	var bottomZeroZ = bottoms[0]
	var variableMap = getVariableMapByStatement(statement)
	for (var point of mesh.points) {
		var x = point[0]
		var xIndex = Math.floor(x)
		var along = x - xIndex
		var oneMinusAlong = 1.0 - along
		var nextIndex = (xIndex + 1) % tops.length
		var value = 0.0
		if (curve != null) {
			variableMap.set('z', ((point[2] * deltaZeroZ) + bottomZeroZ).toString())
			value = getValueByEquation(registry, statement, curve) * (oneMinusAlong * deltaZs[xIndex] + along * deltaZs[nextIndex])
		}
		point[2] *= oneMinusAlong * tops[xIndex][2] + along * tops[nextIndex][2]
		point[2] += oneMinusAlong * bottoms[xIndex] + along * bottoms[nextIndex]
		var minusY = -point[1] - value
		var inset = getAddition2D(tops[xIndex], getMultiplication2DScalar(insetDeltas[xIndex], minusY))
		var nextInset = getAddition2D(tops[nextIndex], getMultiplication2DScalar(insetDeltas[nextIndex], minusY))
		point[0] = oneMinusAlong * inset[0] + along * nextInset[0]
		point[1] = oneMinusAlong * inset[1] + along * nextInset[1]
	}
	mesh.points = get3DsBy3DMatrix(matrix, mesh.points)
}

function getBottoms(registry, statement, tops) {
	var bottoms = getFloatsByStatement('bottoms', registry, statement)
	if (getIsEmpty(bottoms)) {
		bottoms = [0.0]
	}
	var oldBottomLength = bottoms.length
	if (oldBottomLength < tops.length) {
		bottoms.length = tops.length
		for (var bottomIndex = oldBottomLength; bottomIndex < tops.length; bottomIndex++) {
			bottoms[bottomIndex] = bottoms[oldBottomLength - 1]
		}
	}
	return bottoms
}

function getExtrusionMesh(isJoined, matrices, matrix, polygons) {
	if (polygons.length == 0) {
		return null
	}
	var mesh = {facets:[], points:[]}
	var polygonGroups = getPolygonGroups(polygons)
	for (var polygonGroup of polygonGroups) {
		var polygon3DGroup = new Array(polygonGroup.length)
		polygon3DGroup[0] = getPolygon3D(getDirectedPolygon(true, polygonGroup[0]), 0.0)
		for (var polygonIndex = 1; polygonIndex < polygonGroup.length; polygonIndex++) {
			polygon3DGroup[polygonIndex] = getPolygon3D(getDirectedPolygon(false, polygonGroup[polygonIndex]), 0.0)
		}
		addToExtrusionMesh(isJoined, matrices, mesh, polygon3DGroup)
	}
	return removeTriangulateTransform(matrix, mesh)
}

function getHorizontalFacetIndexes(mesh) {
	var facets = mesh.facets
	var horizontalFacetIndexes = []
	var points = mesh.points
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		var addToFacets = true
		var z = points[facet[0]][2]
		for (var vertexIndex = 1; vertexIndex < facet.length; vertexIndex++) {
			if (points[facet[vertexIndex]][2] != z) {
				addToFacets = false
				break
			}
		}
		if (addToFacets) {
			horizontalFacetIndexes.push(facetIndex)
		}
	}
	return horizontalFacetIndexes
}

function getPillarMesh(heights, matrix, polygons) {
	if (polygons.length == 0) {
		return null
	}
	var mesh = {facets:[], points:[]}
	var polygonGroups = getPolygonGroups(polygons)
	for (var polygonGroup of polygonGroups) {
		var polygon3DGroup = new Array(polygonGroup.length)
		polygon3DGroup[0] = getPolygon3D(getDirectedPolygon(true, polygonGroup[0]), 0.0)
		for (var polygonIndex = 1; polygonIndex < polygonGroup.length; polygonIndex++) {
			polygon3DGroup[polygonIndex] = getPolygon3D(getDirectedPolygon(false, polygonGroup[polygonIndex]), 0.0)
		}
		addToPillarMesh(heights, mesh, polygon3DGroup)
	}
	mesh.points = get3DsBy3DMatrix(matrix, mesh.points)
	return mesh
}

function getPlankMesh(heights, id, length) {
	if (length < 1) {
		return null
	}
	var points = []
	var mesh = {facets:[], points:points}
	var numberOfIntervals = length + 1
	var bottom = heights[0]
	var top = heights[heights.length - 1]
	var polygon = [[0.0, bottom, 0.0], [0.0, top, 0.0], [1.0, top, 0.0], [1.0, bottom, 0.0]]
	var zs = new Array(numberOfIntervals)
	for (var intervalIndex = 0; intervalIndex < numberOfIntervals; intervalIndex++) {
		zs[intervalIndex] = intervalIndex
	}
	addToPillarMesh(zs, mesh, [polygon])
	//y>z x>y z>x
	for (var point of points) {
		var x = point[0]
		point[0] = point[2]
		point[2] = point[1]
		point[1] = x
	}
	var betweenHeights = heights.slice(1, -1)
	addSplitIndexes(id, betweenHeights, mesh)
	return mesh
}

function getSculptureMesh(layers, matrix3D) {
	var facets = []
	var oldArrowMap = new Map()
	var oldGridMap = new Map()
	var oldTopFacetsDirections = [[], []]
	var pointLayerMap = new Map()
	var points = []
	var layer = layers[0]
	layer.horizontalFacets = []
	layer.index = 0
	for (var polygon of layer.polygons) {
		layer.pointIndexes = []
		var isClockwise = getIsClockwise(polygon)
		var polygon3D = getPolygon3D(polygon, 0.0)
		var topFacet = []
		for (var point of polygon3D) {
			addPointIndexToGridMapArray(oldGridMap, gHalfMinusOver, point, points.length)
			pointLayerMap.set(points.length, layer)
			topFacet.push(points.length)
			layer.pointIndexes.push(points.length)
			points.push(point)
		}
		oldTopFacetsDirections[1 * isClockwise].push(topFacet)
	}
	for (var layerIndex = 1; layerIndex < layers.length; layerIndex++) {
		var arrowMap = new Map()
		var gridMap = new Map()
		var layer = layers[layerIndex]
		layer.horizontalFacets = []
		layer.index = layerIndex
		layer.pointIndexes = []
		var previousLayer = layers[layerIndex - 1]
		if (layer.vertical && layer.polygons.length == 0) {
			layer.polygons = getArrayArraysCopy(previousLayer.polygons)
		}
		var topFacets = []
		var topFacetsDirections = [[], []]
		for (var polygon of layer.polygons) {
			var connectionFacet = []
			var isClockwise = getIsClockwise(polygon)
			var oldTopFacets = oldTopFacetsDirections[1 * isClockwise]
			var topFacet = []
			if (layer.vertical) {
				var alongIndexesMap = new Map()
				var meetings = []
				for (var toolPolygon of previousLayer.polygons) {
					addMeetingsByPolygon(alongIndexesMap, meetings, toolPolygon, polygon)
				}
				sortRemoveMeetings(alongIndexesMap, meetings)
				var polygonCopy = getArraysCopy(polygon)
				for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
					var key = 'w ' + vertexIndex.toString()
					if (alongIndexesMap.has(key)) {
						var alongIndexes = alongIndexesMap.get(key)
						for (var alongIndexIndex = alongIndexes.length - 1; alongIndexIndex > -1; alongIndexIndex--) {
							var meeting = meetings[alongIndexes[alongIndexIndex][1]]
							if (!meeting.isWorkNode) {
								polygon.splice(vertexIndex + 1, 0, meeting.point)
							}
						}
					}
				}
			}
			var polygon3D = getPolygon3D(polygon, 0.0)
			for (var point of polygon3D) {
				if (layer.vertical) {
					addToVerticalConnectionFacet(
					connectionFacet, facets, oldArrowMap, oldGridMap, point, pointLayerMap, points, previousLayer)
				}
				else {
					addToSlopedConnectionFacet(connectionFacet, oldTopFacets, point, points)
				}
				topFacet.push(points.length)
				addPointIndexToGridMapArray(gridMap, gHalfMinusOver, point, points.length)
				pointLayerMap.set(points.length, layer)
				layer.pointIndexes.push(points.length)
				points.push(point)
			}
			if (layer.vertical) {
				for (var connectionIndex = 0; connectionIndex < connectionFacet.length; connectionIndex++) {
					var connection = connectionFacet[connectionIndex]
					var nextConnection = connectionFacet[(connectionIndex + 1) % connectionFacet.length]
					var facet = [nextConnection.low, connection.low, connection.high, nextConnection.high]
					arrowMap.set(connection.high.toString() + ' ' + nextConnection.high.toString(), facets.length)
					facets.push(facet)
				}
			}
			else {
				for (var connectionIndex = 0; connectionIndex < connectionFacet.length; connectionIndex++) {
					var connection = connectionFacet[connectionIndex]
					var nextConnection = connectionFacet[(connectionIndex + 1) % connectionFacet.length]
					var facet = [nextConnection.low]
					if (connection.topFacetIndex == nextConnection.topFacetIndex) {
						var oldTopFacet = oldTopFacets[connection.topFacetIndex]
						var topFacetLength = oldTopFacet.length
						for (var extraIndex = 0; extraIndex < topFacetLength; extraIndex++) {
							var totalIndex = (nextConnection.vertexIndex - extraIndex + topFacetLength) % topFacetLength
							if (totalIndex == connection.vertexIndex) {
								break
							}
							facet.push(oldTopFacet[(totalIndex - 1 + topFacetLength) % topFacetLength])
						}
					}
					else {
						facet.push(connection.low)
					}
					facet.push(connection.high)
					facet.push(nextConnection.high)
					arrowMap.set(connection.high.toString() + ' ' + nextConnection.high.toString(), facets.length)
					facets.push(facet)
				}
			}
			topFacets.push(topFacet)
			topFacetsDirections[1 * isClockwise].push(topFacet)
		}
		oldArrowMap = arrowMap
		oldGridMap = gridMap
		oldTopFacetsDirections = topFacetsDirections
	}
	addFacetsAlongLoneEdges(facets, layers, pointLayerMap, points)
	for (var layer of layers) {
		for (var pointIndex of layer.pointIndexes) {
			points[pointIndex] = get3DBy3DMatrix(layer.matrix3D, points[pointIndex])
		}
	}
	return removeTriangulateTransform(matrix3D, {facets:facets, points:points})
}

function getTops(registry, statement) {
	var tops = getPointsByDefault([[0, 0, 20], [20, 0, 20]], 'tops', registry, statement, 'fence')
	removeIdenticalXYPoints(tops)
	return tops
}

function getWorkMesh(registry, statement) {
	var attributeMap = statement.attributeMap
	var workMesh = getWorkMeshByID(attributeMap.get('work'), registry)
	if (workMesh == null) {
		return null
	}
	if (getBooleanByDefault(false, 'copy', registry, statement, statement.tag)) {
		workMesh = getMeshCopy(workMesh)
	}
	return workMesh
}

function getWorkMeshByID(id, registry) {
	if (!registry.meshMap.has(id)) {
		return null
	}
	return registry.meshMap.get(id)
}

function getWorkMeshes(registry, statement) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has('work')) {
		return []
	}
	var workIDs = attributeMap.get('work').replace(/,/g, ' ').split(' ').filter(lengthCheck)
	var shouldCopy = getBooleanByDefault(false, 'copy', registry, statement, statement.tag)
	var workMeshes = []
	for (var workID of workIDs) {
		var workMesh = getWorkMeshByID(workID, registry)
		if (workMesh != null) {
			if (shouldCopy) {
				workMesh = getMeshCopy(workMesh)
			}
			workMeshes.push(workMesh)
		}
	}
	return workMeshes
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
				facet[vertexIndex] = getLinkTop(pointIndex, linkMap)
			}
		}
		removeRepeats(facet)
	}
	removeShortArrays(facets, 3)
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
					addElementToMapArray(pointIndex, getEdgeKey(beginPointIndex, endPointIndex), segmentMap)
				}
			}
		}
	}
	addPointsToFacets(mesh, segmentMap)
	for (var facetIndex = facets.length - 1; facetIndex > -1; facetIndex--) {
		var facet = facets[facetIndex]
		removeRepeats(facet)
		var pointIndexSet = new Set()
		for (var pointIndex of facet) {
			if (pointIndexSet.has(pointIndex)) {
				separateFacets = getJoinedFacets([facet])
				if (separateFacets.length == 0) {
					facets.splice(facetIndex, 1)
				}
				else {
					var joinedFacet = separateFacets[0]
					if (separateFacets.length > 1) {
						joinedFacet = getConnectedFacet(separateFacets, points)
					}
					facets[facetIndex] = joinedFacet
				}
				break
			}
			else {
				pointIndexSet.add(pointIndex)
			}
		}
	}
}

function removeTriangulateTransform(matrix, mesh) {
	removeTooThinFacets(mesh)
	triangulateBentFacets(mesh)
	mesh.points = get3DsBy3DMatrix(matrix, mesh.points)
	return mesh
}

function triangulateBentFacets(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var xyPoints = new Array(points.length)
	for (var facetIndex = facets.length - 1; facetIndex > -1; facetIndex--) {
		var facet = facets[facetIndex]
		if (facet.length > 3) {
			if (getIsPolygonBent(getPolygonByFacet(facet, points))) {
				var xyzTriangleFacets = get3DTriangleFacets(facet, points, xyPoints)
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
		statement.tag = 'g'
		var isJoined = getBooleanByDefault(false, 'join', registry, statement, this.name)
		var matrices = get3DMatricesAndZeroHeight(registry, statement, null)
		var matrix = getChainMatrix3D(registry, statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		if (getIsEmpty(polygons)) {
			noticeByList(['No polygons could be found for extrusion in generator3d.', statement])
			return
		}
		analyzeOutputMesh(getExtrusionMesh(isJoined, matrices, matrix, polygons), registry, statement)
	}
}

var gFence = {
	alterMesh: function(mesh, registry, statement) {
		var tops = getTops(registry, statement)
		var bottoms = getBottoms(registry, statement, tops)
		var betweens = getFloatsByStatement('betweens', registry, statement)
		var curve = getEquation('curve', statement)
		var matrix = getChainMatrix3D(registry, statement)
		convertPlankToFence(betweens, bottoms, curve, null, mesh, registry, statement, tops)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'fence',
	processStatement:function(registry, statement) {
		var heights = getHeights(registry, statement, this.name)
		var tops = getTops(registry, statement)
		var mesh = getPlankMesh(heights, statement.attributeMap.get('id'), tops.length - 1)
		var bottoms = getBottoms(registry, statement, tops)
		var overhangAngle = getFloatByDefault(40.0, 'overhangAngle', registry, statement, this.name) * gRadiansPerDegree
		var thickness = getFloatByDefault(2.0, 'thickness', registry, statement, this.name)
		var width = getFloatByDefault(10.0, 'width', registry, statement, this.name)
		addHolesToFence(bottoms, mesh, overhangAngle, thickness, tops, width)
		this.alterMesh(mesh, registry, statement)
		analyzeOutputMesh(mesh, registry, statement)
	}
}

var gPillar = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'pillar',
	processStatement:function(registry, statement) {
		statement.tag = 'g'
		var heights = getHeights(registry, statement, this.name)
		var matrix = getChainMatrix3D(registry, statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		if (getIsEmpty(polygons)) {
			noticeByList(['No polygons could be found for pillar in generator3d.', statement])
			return
		}
		analyzeOutputMesh(getPillarMesh(heights, matrix, polygons), registry, statement)
	}
}

var gPlank = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'plank',
	processStatement:function(registry, statement) {
		var length = getIntByDefault(1, 'length', registry, statement, this.name)
		var heights = getHeights(registry, statement, this.name)
		var matrix = getChainMatrix3D(registry, statement)
		var mesh = getPlankMesh(heights, statement.attributeMap.get('id'), length)
		mesh.points = get3DsBy3DMatrix(matrix, mesh.points)
		analyzeOutputMesh(mesh, registry, statement)
	}
}

var gRoad = {
	alterMesh: function(mesh, registry, statement) {
		var betweens = getFloatsByStatement('betweens', registry, statement)
		var centers = getPointsByDefault([[0, 0, 2], [10, 0]], 'centers', registry, statement, 'road')
		var curve = getEquation('curve', statement)
		var matrix = getChainMatrix3D(registry, statement)
		convertPlankToRoad(betweens, centers, curve, matrix, mesh, registry, statement)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'road',
	processStatement:function(registry, statement) {
		var centers = getPointsByDefault([[0, 0, 2], [10, 0]], 'centers', registry, statement, 'road')
		var heights = getHeights(registry, statement, this.name)
		var mesh = getPlankMesh(heights, statement.attributeMap.get('id'), centers.length - 1)
		this.alterMesh(mesh, registry, statement)
		analyzeOutputMesh(mesh, registry, statement)
	}
}

var gSculpture = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'sculpture',
	processStatement:function(registry, statement) {
		convertToGroupIfParent(statement)
		var vertical = true
		var layerMap = new Map()
		var layers = []
		for (var child of statement.children) {
			if (child.tag == 'layer') {
				var polygons = getPolygonsHDRecursively(registry, child)
				var childMatrices = get3DMatrices(registry, child, null)
				if (child.attributeMap.has('vertical')) {
					vertical = getBooleanByStatement('vertical', registry, child)
				}
				var id = child.attributeMap.get('id')
				var workIDs = getWorkIDs(registry, child)
				for (var count = 0; count < childMatrices.length; count++) {
					var layer = null
					if (workIDs.length > 0) {
						var layerID = workIDs[count % workIDs.length]
						if (layerMap.has(layerID)) {
							var oldLayer = layerMap.get(layerID)
							layer = {polygons:oldLayer.polygons, vertical:oldLayer.vertical}
						}
						else {
							noticeByList(['No layer could be found for sculpture in generator3d.', layerID, child, statement])
						}
					}
					else {
						layer = {polygons:polygons, vertical:vertical}
					}
					if (layer != null) {
						layer.matrix3D = childMatrices[count]
						layerMap.set(id, layer)
						layers.push(layer)
					}
				}
				convertToGroupIfParent(child)
			}
		}
		if (layers.length < 2) {
			noticeByList(['Less than 2 layers could be found for sculpture in generator3d.', statement])
			return
		}
		var matrix3D = getChainMatrix3D(registry, statement)
		analyzeOutputMesh(getSculptureMesh(layers, matrix3D), registry, statement)
	}
}

var gGenerator3DProcessors = [gExtrusion, gFence, gPillar, gPlank, gRoad, gSculpture]
