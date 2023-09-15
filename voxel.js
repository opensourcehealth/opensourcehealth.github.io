//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gDirections = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]]
const gXYPlanar = [1, 2, 0, 3]
const gYZPlanar = [3, 4, 2, 5]
const gZXPlanar = [5, 0, 4, 1]
const gPlanars = [gYZPlanar, gZXPlanar, gXYPlanar]

function addTestVoxels(voxelMap) {
	voxelMap.set('10,0,0', [null,null,null,null,null,null]);
//	return
	voxelMap.set('11,0,0', [null,null,null,[11.0, 0.3, 0.0],null,null]);
	voxelMap.set('12,0,0', [null,null,null,null,null,null]);
	voxelMap.set('13,0,0', [null,null,null,null,null,null]);
	voxelMap.set('13,1,0', [null,null,null,null,null,null]);
	voxelMap.set('13,2,0', [null,null,null,null,null,null]);
	voxelMap.set('13,3,0', [null,null,null,null,null,null]);
	voxelMap.set('12,3,0', [null,null,null,null,null,null]);
	voxelMap.set('11,3,0', [null,null,null,null,null,null]);
	voxelMap.set('10,3,0', [null,null,null,null,null,null]);
	voxelMap.set('10,2,0', [null,null,null,null,null,null]);
	voxelMap.set('10,1,0', [null,null,null,null,null,null]);
	voxelMap.set('11,1,0', [null,null,[11.0, 0.7, 0.0],null,null,null]);
	voxelMap.set('10,0,1', [null,null,null,null,null,null]);
	voxelMap.set('10,1,1', [null,null,null,null,null,null]);
}

function addVoxelLine(crossDimension, key, lines, voxelMap, planar, pointMap, root, rotationIndex, tipMap, tips) {
	var endTipRotationIndex = rotationIndex
	var endTipDirectionIndex = planar[endTipRotationIndex]
	var originalTips = tips.slice(0)
	var tipZero = tips[endTipDirectionIndex]
	if (tipZero == null) {
		return
	}
	var line = {
		beginKey:key + ',' + endTipDirectionIndex,
		beginDirectionIndex:planar[(rotationIndex + 1) % 4],
		crossDirectionIndex:crossDimension + crossDimension}
	var next = root.slice(0)
	pointMap.set(line.beginKey, tipZero)
	for (var endRotationIndex = rotationIndex + 5; endRotationIndex > rotationIndex + 1; endRotationIndex--) {
		var tipIndex = planar[endRotationIndex % 4]
		if (tips != null) {
			var tipNext = tips[tipIndex]
			if (tipNext != null) {
				line.endDirectionIndex = endTipDirectionIndex
				line.endKey = key + ',' + tipIndex
				line.endPoint = tipNext
				addLineToMap(line, lines, tipMap, tipZero)
				lines.push(line)
				reversedLine = {
					beginDirectionIndex:line.endDirectionIndex,
					beginKey:line.endKey,
					beginPoint:line.endPoint,
					crossDirectionIndex:line.crossDirectionIndex + 1,
					endDirectionIndex:line.beginDirectionIndex,
					endKey:line.beginKey}
				addLineToMap(reversedLine, lines, tipMap, reversedLine.beginPoint)
				return
			}
		}
		add3D(next, gDirections[tipIndex])
		key = next.join(',')
		if (voxelMap.has(key)) {
			tips = voxelMap.get(key)
		}
		else {
			tips = null
		}
		endTipRotationIndex = (endTipRotationIndex + 3) % 4
		endTipDirectionIndex = planar[endTipRotationIndex]
	}
	console.log('addVoxelLine')
	console.log(key)
	console.log(originalTips)
	console.log(voxelMap)
	console.log(planar)
}

function addVoxelLines(crossDimension, voxelMap, lines, pointMap, tipMap) {
	for (var entry of voxelMap) {
		var key = entry[0]
		var parameters = key.split(',')
		var planar = gPlanars[crossDimension]
		var root = [parseInt(parameters[0]), parseInt(parameters[1]), parseInt(parameters[2])]
		var tips = entry[1]
		for (rotationIndex = 0; rotationIndex < 4; rotationIndex++) {
			addVoxelLine(crossDimension, key, lines, voxelMap, planar, pointMap, root, rotationIndex, tipMap, tips)
		}
	}
}

function addVoxelRow(directionIndex, entry, signedIntersectionsMap, voxelMap) {
	var direction = gDirections[directionIndex]
	var key = entry[0]
	var signedIntersections = entry[1]
	var yzParameters = key.split(',');
	var y = parseInt(yzParameters[0])
	var yBeside = y + direction[1]
	var z = parseInt(yzParameters[1])
	var zBeside = z + direction[2]
	var keyBeside = yBeside + ',' + zBeside
	if (signedIntersectionsMap.has(keyBeside)) {
		var signedIntersectionsAbove = signedIntersectionsMap.get(keyBeside)
		var signedIntersectionsInverted = []
		for (var signedIntersection of signedIntersectionsAbove) {
			signedIntersectionsInverted.push([signedIntersection[0], -signedIntersection[1]])
		}
		signedIntersections = signedIntersections.concat(signedIntersectionsInverted)
	}
	signedIntersections.sort(compareSignedIntersectionAscending)
	var existence = 0
	var voxelStart = null
	for (signedIntersectionIndex = 0; signedIntersectionIndex < signedIntersections.length; signedIntersectionIndex++) {
		var signedIntersection = signedIntersections[signedIntersectionIndex]
		var existenceChange = signedIntersection[1]
		if (existenceChange < 0) {
			if (existence > 0) {
				for (voxelIndex = voxelStart; voxelIndex < signedIntersection[0]; voxelIndex++) {
					var voxelKey = voxelIndex + ',' + key
					if (!voxelMap.has(voxelKey)) {
						voxelMap.set(voxelKey, [null,null,null,null,null,null])
					}
					var root = [voxelIndex, y, z]
					voxelMap.get(voxelKey)[directionIndex] = root
				}
			}
		}
		else {
			voxelStart = signedIntersection[0]
		}
		existence += existenceChange
	}
}

function addVoxels(signedIntersectionsMap, voxelMap) {
	for (var entry of signedIntersectionsMap) {
		addVoxelRow(2, entry, signedIntersectionsMap, voxelMap)
		addVoxelRow(3, entry, signedIntersectionsMap, voxelMap)
	}
	for (var entry of signedIntersectionsMap) {
		addVoxelRow(4, entry, signedIntersectionsMap, voxelMap)
		addVoxelRow(5, entry, signedIntersectionsMap, voxelMap)
	}
}

function createTips(voxelMap) {
	for (var entry of voxelMap) {
		var parameters = entry[0].split(',');
		var root = [parseInt(parameters[0]), parseInt(parameters[1]), parseInt(parameters[2])];
		var distance = [0.3, 0.3, 0.3];
		var voxel = entry[1]
		for (rotationIndex = 0; rotationIndex < 6; rotationIndex++) {
			var direction = gDirections[rotationIndex]
			if (!voxelMap.has(get3DAddition(root, direction).join(','))) {
				voxel[rotationIndex] = get3DAddition(root, get3DMultiplication(distance, direction))
			}
		}
	}
}

function createTipsByIntersectionPairsMap(intersectionPairsMap, voxelMap, z) {
	for (var entry of intersectionPairsMap) {
		var y = entry[0]
		var intersectionPairs = entry[1]
		for (var intersectionPair of intersectionPairs) {
			var key = [intersectionPair.beginIndex, y, z]
			var position = [intersectionPair.beginIntersection, y, z]
			getVoxel(key.join(','), voxelMap)[0] = position
			key[0] = intersectionPair.endIndex
			position = position.slice(0)
			position[0] = intersectionPair.endIntersection
			getVoxel(key.join(','), voxelMap)[1] = position
		}
	}
}

function getMeshAddition(layerThickness, offsetMultiplier, meshA, meshB) {
	return getMeshBoolean(existenceConditionPositive, layerThickness, offsetMultiplier, meshA, meshB, 1)
}

function getMeshBoolean(existenceCondition, layerThickness, offsetMultiplier, meshA, meshB, signB) {
	var offsetZ = offsetMultiplier * layerThickness
	var oneOverLayerThickness = 1.0 / layerThickness
	var pointsATransformed = getArraysCopy(meshA.points)
	var pointsBTransformed = getArraysCopy(meshB.points)
	addArraysByZ(pointsATransformed, -offsetZ)
	addArraysByZ(pointsBTransformed, -offsetZ)
	multiply3DsScalar(pointsATransformed, oneOverLayerThickness)
	multiply3DsScalar(pointsBTransformed, oneOverLayerThickness)
	var latticeA = getXYZLatticeByMesh({facets:meshA.facets, points:pointsATransformed})
	var latticeB = getXYZLatticeByMesh({facets:meshB.facets, points:pointsBTransformed})
	var latticeBoolean = getXYZLatticeBoolean(existenceCondition, signB, latticeA, latticeB)
	var mesh = getMeshByXYZLattice(latticeBoolean)
	mesh.points = getArraysCopy(mesh.points)
	addArraysByZ(multiply3DsScalar(mesh.points, layerThickness), offsetZ)
	return mesh
}

function getMeshExclusiveIntersection(layerThickness, offsetMultiplier, meshA, meshB) {
	return getMeshBoolean(existenceConditionOne, layerThickness, offsetMultiplier, meshA, meshB, 1)
}

function getMeshIntersection(layerThickness, offsetMultiplier, meshA, meshB) {
	return getMeshBoolean(existenceConditionTwo, layerThickness, offsetMultiplier, meshA, meshB, 1)
}

function getMeshSubtraction(layerThickness, offsetMultiplier, meshA, meshB) {
	return getMeshBoolean(existenceConditionPositive, layerThickness, offsetMultiplier, meshA, meshB, -1)
}
/*
function setPointsMaps(key, pointMap, points, pointStringIndexMap) {
	var close = 0.0000001
	var closeDivided = 0.3 * close
	var oneOverClose = 10000000.0
	var point = pointMap.get(key)
//	var pointString = (point[0]-0.00003).toFixed(4) + ' ' + (point[1]-0.00003).toFixed(4) + ' ' + (point[2]-0.00003).toFixed(4)
	var x = point[0]
	var y = point[1]
	var z = point[2]
	var xRound = Math.round(x * oneOverClose) * close
	var yRound = Math.round(y * oneOverClose) * close
	var zRound = Math.round(z * oneOverClose) * close
	var pointXString = xRound.toFixed(7)
//	var pointXString = xRound.toString()
//	var pointXString = x.toFixed(7)
	var pointXStrings = [pointXString]
	var pointYString = yRound.toFixed(7)
//	var pointYString = yRound.toString()
//	var pointYString = y.toFixed(7)
	var pointYStrings = [pointYString]
	var pointZString = zRound.toFixed(7)
//	var pointZString = zRound.toString()
//	var pointZString = z.toFixed(7)
	var pointZStrings = [pointZString]
	var pointString = pointXString + ' ' + pointYString + ' ' + pointZString
//	console.log('x - parseFloat(pointXString)')
//	console.log(x - parseFloat(pointXString))
//	console.log(x - xRound)

	if (x.toFixed(7) != xRound.toFixed(7)) {
		console.log('x')
		console.log(x)
		console.log(x.toFixed(7))
		console.log(xRound.toFixed(7))
	}
	if (y.toFixed(7) != yRound.toFixed(7)) {
		console.log('y')
		console.log(y)
		console.log(y.toFixed(7))
		console.log(yRound.toFixed(7))
	}
	if (z.toFixed(7) != zRound.toFixed(7)) {
		console.log('z')
		console.log(z)
		console.log(z.toFixed(7))
		console.log(zRound.toFixed(7))
	}

//	var differenceX = Math.abs(xRound - parseFloat(x.toFixed(7)))
//	var differenceX = Math.abs(x - parseFloat(x.toFixed(7)))
//	var differenceX = Math.abs(x - xRound)
//	if (differenceX > closeDivided) {
//		console.log('x')
//		console.log(x)
//		console.log(differenceX)
//		console.log(close)
//	}
//	var differenceY = Math.abs(yRound - parseFloat(y.toFixed(7)))
//	var differenceY = Math.abs(y - parseFloat(y.toFixed(7)))
//	var differenceY = Math.abs(y - yRound)
//	if (differenceY > closeDivided) {
//		console.log('y')
//		console.log(y)
//		console.log(differenceY)
//		console.log(close)
//	}
//	var differenceZ = Math.abs(zRound - parseFloat(z.toFixed(7)))
//	var differenceZ = Math.abs(z - parseFloat(z.toFixed(7)))
//	var differenceZ = Math.abs(z - zRound)
//	if (differenceZ > closeDivided) {
//		console.log('z')
//		console.log(z)
//		console.log(differenceZ)
//		console.log(close)
//	}
	if (pointStringIndexMap.has(pointString)) {
		pointMap.set(key, pointStringIndexMap.get(pointString))
		return
	}
	pointStringIndexMap.set(pointString, points.length)
	pointMap.set(key, points.length)
	points.push(point)
}
*/
function getMeshByTipMap(pointMap, tipMap) {
	var centerSideMap = new Map()
	var facets = []
	var facetStringMap = new Map()
	var points = []
	var pointStringIndexMap = new Map()
	var mesh = {facets:facets, points:points}
	for (var key of pointMap.keys()) {
		var point = pointMap.get(key)
		var pointString = getCloseString(point[0]) + ' ' + getCloseString(point[1]) + ' ' + getCloseString(point[2])
		if (pointStringIndexMap.has(pointString)) {
			pointMap.set(key, pointStringIndexMap.get(pointString))
		}
		else {
			pointStringIndexMap.set(pointString, points.length)
			pointMap.set(key, points.length)
			points.push(point)
		}

	}
	for (var tip of tipMap.values()) {
		for (var line of tip.lines) {
			var originalBeginKey = line.beginKey
			if (!pointMap.has(originalBeginKey)) {
				warningByList(['In getMeshByTipMap, originalBeginKey', originalBeginKey, 'could not be found in the point map.'])
				break
			}
			var facet = [pointMap.get(originalBeginKey)]
			for (tipIndex = 0; tipIndex < 98; tipIndex++) {
				var crossDirectionIndex = line.crossDirectionIndex
				var tipLines = tipMap.get(line.endKey).lines
				for (tipLineIndex = 0; tipLineIndex < 4; tipLineIndex++) {
					var tipLine = tipLines[tipLineIndex]
					if (tipLine == null) {
						warningByList(['In getMeshByTipMap, tipLine is null', tipLines, tip])
					}
					else {
						if (tipLine.beginDirectionIndex == crossDirectionIndex) {
							line = tipLine
							break
						}
					}
				}
				if (line.beginKey == originalBeginKey) {
					break
				}
				else {
					if (!pointMap.has(line.beginKey)) {
						warningByList(['In getMeshByTipMap, line.beginKey', line.beginKey, 'could not be found in the point map.'])
						break
					}
					var pointIndex = pointMap.get(line.beginKey)
					if (pointIndex != facet[facet.length - 1]) {
						facet.push(pointIndex)
					}
				}
			}
			if (facet[0] == facet[facet.length - 1]) {
				facet.pop()
			}
			if (facet.length > 2) {
				var polygonRotatedToBottom = getPolygonRotatedToBottom(facet)
//				var facetString = polygonRotatedToBottom.join(' ')
				facetStringMap.set(polygonRotatedToBottom.join(' '), polygonRotatedToBottom)
/*
				var facetStringReverse = getPolygonRotatedToBottom(facet.slice(0).reverse()).join(' ')
				if (facetStringMap.has(facetStringReverse)) {
					var numberOfFacets = facetStringMap.get(facetStringReverse) - 1
					if (numberOfFacets == 0) {
						facetStringMap.delete(facetStringReverse)
					}
					else {
						facetStringMap.set(facetStringReverse, numberOfFacets)
					}
				}
				else {
					if (facetStringMap.has(facetString)) {
						facetStringMap.set(facetString, facetStringMap.get(facetString) + 1)
					}
					else {
						facetStringMap.set(facetString, 1)
					}

					for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
						var begin = facet[(vertexIndex + facet.length - 1) % facet.length]
						var center = facet[vertexIndex]
						var end = facet[(vertexIndex + 1) % facet.length]
						var centerSideString = center.toString() + ' ' + begin.toString() + ' ' + end.toString()
						var reverseSideString = center.toString() + ' ' + end.toString() + ' ' + begin.toString()
							centerSideMap.set(centerSideString, facetString)
						if (centerSideMap.has(reverseSideString)) {
//							removeCenterSide(centerSideMap, centerSideString, facetStringMap)
//							removeCenterSide(centerSideMap, reverseSideString, facetStringMap)
//							centerSideMap.delete(centerSideString)
//							centerSideMap.delete(reverseSideString)
//							warningByList(['In getMeshByTipMap, reverseSideString was in centerSideMap', centerString, centerSideMap] )
						}
//						else {
//							centerSideMap.set(centerSideString, facetString)
//						}
					}

				}
*/
			}
		}
	}
/*
	for (var facetString of facetStringMap.keys()) {
		var indexStrings = facetString.split(' ')
		for (var indexStringIndex = 0; indexStringIndex < indexStrings.length; indexStringIndex++) {
			var beginString = indexStrings[(indexStringIndex + indexStrings.length - 1) % indexStrings.length]
			var centerString = indexStrings[indexStringIndex]
			var endString = indexStrings[(indexStringIndex + 1) % indexStrings.length]
			var centerSideString = beginString + ' ' + centerString + ' ' + endString
			centerSideMap.set(centerSideString, facetString)
		}
	}
	var numberOfDuplicates = 0
	for (var centerSideString of centerSideMap.keys()) {
		var centerSideStrings = centerSideString.split(' ')
		centerSideStrings.reverse()
		var reverseSide = centerSideStrings.join(' ')
		if (centerSideMap.has(reverseSide)) {
			numberOfDuplicates += 1
			removeCenterSide(centerSideMap, centerSideString, facetStringMap)
		}
	}
	console.log('centerSideMap')
	console.log(centerSideMap)
	console.log(numberOfDuplicates)
*/
	for (var facetString of facetStringMap.keys()) {
		var facet = facetStringMap.get(facetString)
		if (facet.length > 2) {
			facets.push(facet)
		}
	}
	return mesh
}

function getMeshByXYZLattice(xyzLattice) {
	var lines = []
	var pointMap = new Map()
	var tipMap = new Map()
	var voxelMap = getVoxelMapByXYZLattice(xyzLattice)
	addVoxelLines(2, voxelMap, lines, pointMap, tipMap)
	addVoxelLines(0, voxelMap, lines, pointMap, tipMap)
	addVoxelLines(1, voxelMap, lines, pointMap, tipMap)
	var mesh = getMeshByTipMap(pointMap, tipMap)
	return getPolygonateMesh(mesh)
}

function getVoxel(key, voxelMap) {
	if (voxelMap.has(key)) {
		return voxelMap.get(key)
	}
	var voxel = [null,null,null,null,null,null]
	voxelMap.set(key, voxel)
	return voxel
}

function getVoxelMapByXYZLattice(xyzLattice) {
	var voxelMap = new Map()
	for (var entry of xyzLattice[0]) {
		createTipsByIntersectionPairsMap(entry[1], voxelMap, entry[0])
	}
	addVoxels(getSignedIntersectionsMapBySpacelMap(voxelMap), voxelMap)
	for (var entry of xyzLattice[1]) {
		positionVoxelsByIntersectionPairsMap(entry[1], [1, 0], voxelMap, entry[0])
	}
	if (xyzLattice.length == 2) {
		return voxelMap
	}
	for (var entry of xyzLattice[2]) {
		positionVoxelsByIntersectionPairsMap(entry[1], [2, 0], voxelMap, entry[0])
	}
	return voxelMap
}

function getXYZLatticeAddition(xyzLatticeA, xyzLatticeB) {
	return getXYZLatticeBoolean(existenceConditionPositive, 1, xyzLatticeA, xyzLatticeB)
}

function getXYZLatticeBoolean(existenceCondition, signB, xyzLatticeA, xyzLatticeB) {
	var xyzLatticeC = new Array(xyzLatticeA.length)
	for (var mapIndex = 0; mapIndex < xyzLatticeA.length; mapIndex++) {
		var intersectionPairsMapMapA = xyzLatticeA[mapIndex]
		var intersectionPairsMapMapB = xyzLatticeB[mapIndex]
		var intersectionPairsMapMapC = new Map()
		var keySet = new Set()
		addElementsToSet(keySet, intersectionPairsMapMapA.keys())
		addElementsToSet(keySet, intersectionPairsMapMapB.keys())
		for (var key of keySet) {
			var intersectionPairsMapA = null
			if (intersectionPairsMapMapA.has(key)) {
				intersectionPairsMapA = intersectionPairsMapMapA.get(key)
			}
			var intersectionPairsMapB = null
			if (intersectionPairsMapMapB.has(key)) {
				intersectionPairsMapB = intersectionPairsMapMapB.get(key)
			}
			var intersectionPairsMap = getIntersectionPairsMapBoolean(existenceCondition, signB, intersectionPairsMapA, intersectionPairsMapB)
			intersectionPairsMapMapC.set(key, intersectionPairsMap)
		}
		xyzLatticeC[mapIndex] = intersectionPairsMapMapC
//		var intersectionPairsMapA = xyLatticeA[mapIndex]
//		var intersectionPairsMapB = xyLatticeB[mapIndex]
//		xyLatticeC[mapIndex] = getIntersectionPairsMapBoolean(existenceCondition, signB, intersectionPairsMapA, intersectionPairsMapB)
/*

		var intersectionPairsMapA = xyzLatticeA[intersectionPairsMapIndex]
		var intersectionPairsMapB = xyzLatticeB[intersectionPairsMapIndex]
		console.log(intersectionPairsMapA)
		console.log(intersectionPairsMapB)
		var intersectionPairsMapC = new Map()
		xyzLatticeC[intersectionPairsMapIndex] = intersectionPairsMapC
		var keySet = new Set()
		addElementsToSet(keySet, intersectionPairsMapA.keys())
		addElementsToSet(keySet, intersectionPairsMapB.keys())
		for (var key of keySet) {
			var intersectionPairsA = null
			if (intersectionPairsMapA.has(key)) {
				intersectionPairsA = intersectionPairsMapA.get(key)
			}
			var intersectionPairsB = null
			if (intersectionPairsMapB.has(key)) {
				intersectionPairsB = intersectionPairsMapB.get(key)
			}
			var signedIntersections = getSignedIntersections(intersectionPairsA, intersectionPairsB, signB)
			intersectionPairsMapC.set(key, getIntersectionPairsByExistence(existenceCondition, signedIntersections))
		}
*/
	}
	return xyzLatticeC
}

function getXYZLatticeExclusiveIntersection(xyzLatticeA, xyzLatticeB) {
	return getXYZLatticeBoolean(existenceConditionOne, 1, xyzLatticeA, xyzLatticeB)
}

function getXYZLatticeIntersection(xyzLatticeA, xyzLatticeB) {
	return getXYZLatticeBoolean(existenceConditionTwo, 1, xyzLatticeA, xyzLatticeB)
}

function getXYZLatticeSubtraction(xyzLatticeA, xyzLatticeB) {
	return getXYZLatticeBoolean(existenceConditionPositive, -1, xyzLatticeA, xyzLatticeB)
}

function getXYZLatticeByMesh(mesh) {
	xyPolygonsMap = getSlicePolygonsMapByMesh(mesh)
	var xyzLattice = new Array(3)
	xyzLattice[0] = new Map()
	for (var entry of xyPolygonsMap) {
		xyzLattice[0].set(entry[0], getIntersectionPairsMap(entry[1]))
	}
	xyzLattice[1] = new Map()
	for (var entry of xyPolygonsMap) {
		var xyPolygons = entry[1]
		swapXYPolygons(xyPolygons)
		xyzLattice[1].set(entry[0], getIntersectionPairsMap(xyPolygons))
	}
	rotateXYZParametersByPoints(2, mesh.points)
	var xyPolygonsMap = getSlicePolygonsMapByMesh(mesh)
	xyzLattice[2] = new Map()
	for (var entry of xyPolygonsMap) {
		xyzLattice[2].set(entry[0], getIntersectionPairsMap(entry[1]))
	}
	rotateXYZParametersByPoints(-2, mesh.points)
	return xyzLattice
}

function positionVoxelsByIntersectionPairsMap(intersectionPairsMap, plane, voxelMap, z) {
	var plane0 = plane[0]
	var plane1 = plane[1]
	var plane2 = 3 - plane0 - plane1
	var direction0 = plane0 + plane0
	var direction1 = direction0 + 1
	for (var entry of intersectionPairsMap) {
		var y = entry[0]
		var intersectionPairs = entry[1]
		for (var intersectionPair of intersectionPairs) {
			var key = new Array(3)
			key[plane0] = intersectionPair.beginIndex
			key[plane1] = y
			key[plane2] = z
			var position = new Array(3)
			position[plane0] = intersectionPair.beginIntersection
			position[plane1] = y
			position[plane2] = z
			setVoxelPosition(direction0, key, position, voxelMap)
			key[plane0] = intersectionPair.endIndex
			var position = position.slice(0)
			position[plane0] = intersectionPair.endIntersection
			setVoxelPosition(direction1, key, position, voxelMap)
		}
	}
}
gTotalMiss = 0

function setVoxelPosition(direction, key, position, voxelMap) {
	var keyString = key.join(',')
	if (voxelMap.has(keyString)) {
		var voxel = voxelMap.get(keyString)
		if (voxel[direction] != null) {
			voxel[direction] = position
		}

		else {
			gTotalMiss+=1
			console.log('gTotalMiss')
			console.log(gTotalMiss)
			console.log(direction)
			console.log(key)
			console.log(position)
			console.log(voxelMap)
/*
			key[0] += 1
			key[1] += 0
			key[2] += 0
			keyString = key.join(',')
			console.log(key)
			console.log(voxelMap.has(keyString))
			if (voxelMap.has(keyString)) {
				var voxel = voxelMap.get(keyString)
				if (voxel[direction] != null) {
					voxel[direction] = position
				}
				return
			}
			key[0] += -2
			key[1] += 0
			key[2] += 0
			keyString = key.join(',')
			console.log(key)
			console.log(voxelMap.has(keyString))
			if (voxelMap.has(keyString)) {
				var voxel = voxelMap.get(keyString)
				if (voxel[direction] != null) {
					voxel[direction] = position
				}
				return
			}
*/
		}

	}
}
