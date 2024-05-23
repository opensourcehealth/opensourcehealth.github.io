//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
//https://upload.wikimedia.org/wikipedia/commons/3/39/Periodic_table_large.png

var Science = {
airDensity: function(height = 0.0, pressure = 101300, temperature = 298.15, gravity = 9.8, molecularWeight = 28.97) {
	var seaLevelDensity = pressure * molecularWeight / 8314.46261815324 / temperature
	return seaLevelDensity / Math.exp(height / Science.airColumnHeight(temperature, gravity, molecularWeight))
},

airColumnHeight: function(temperature = 298.15, gravity = 9.8, molecularWeight = 28.97) {
	return temperature * 8314.46261815324 / molecularWeight / gravity
},

getAtomicMassMap: function() {
	if (Science.atomicMassMap != undefined) {
		return Science.atomicMassMap
	}

	var atomicMassSkips = ['H', 1.00794, 'He', 4.002602]

	arrayKit.pushArray(atomicMassSkips, ['Li', 6.941, 'Be', 9.012182])
	arrayKit.pushArray(atomicMassSkips, ['B', 10.811, 'C', 12.0107, 'N', 14.0067, 'O', 15.9994, 'F', 18.998403, 'Ne', 20.1797])

	arrayKit.pushArray(atomicMassSkips, ['Na', 22.98976, 'Mg', 24.305])
	arrayKit.pushArray(atomicMassSkips, ['Al', 26.98153, 'Si', 28.0855, 'P', 30.97696, 'S', 32.065, 'Cl', 35.453, 'Ar', 39.948])

	arrayKit.pushArray(atomicMassSkips, ['K', 39.0983, 'Ca', 40.078])
	arrayKit.pushArray(atomicMassSkips, ['Sc', 44.95591, 'Ti', 47.867, 'V', 50.9415, 'Cr', 51.9962, 'Mn', 54.93804])
	arrayKit.pushArray(atomicMassSkips, ['Fe', 55.845, 'Co', 58.93319, 'Ni', 58.6934, 'Cu', 63.546, 'Zn', 65.38])
	arrayKit.pushArray(atomicMassSkips, ['Ga', 69.723, 'Ge', 72.64, 'As', 74.9216, 'Se', 78.96, 'Br', 79.904, 'Kr', 83.798])

	arrayKit.pushArray(atomicMassSkips, ['Rb', 85.4678, 'Sr', 87.62])
	arrayKit.pushArray(atomicMassSkips, ['Y', 88.90585, 'Zr', 91.224, 'Nb', 92.90638, 'Mo', 95.96, 'Tc', 98])
	arrayKit.pushArray(atomicMassSkips, ['Ru', 101.07, 'Rh', 102.9055, 'Pd', 106.42, 'Ag', 107.8682, 'Cd', 112.441])
	arrayKit.pushArray(atomicMassSkips, ['In', 114.818, 'Sn', 118.71, 'Sb', 121.76, 'Te', 127.6, 'I', 126.9044, 'Xe', 131.293])

	arrayKit.pushArray(atomicMassSkips, ['Cs', 132.9054, 'Ba', 137.327])
	arrayKit.pushArray(atomicMassSkips, ['La', 138.9054, 'Ce', 140.116, 'Pr', 140.9076, 'Nd', 144.242, 'Pm', 145, 'Sm', 150.36, 'Eu', 151.964])
	arrayKit.pushArray(atomicMassSkips, ['Gb', 157.25, 'Td', 158.9253, 'Dy', 162.500, 'Ho', 164.9303, 'Er', 167.259, 'Tm', 168.9342, 'Yb', 173.054])
	arrayKit.pushArray(atomicMassSkips, ['Lu', 174.9668, 'Hf', 178.49, 'Ta', 180.9478, 'W', 183.84, 'Re', 186.207])
	arrayKit.pushArray(atomicMassSkips, ['Os', 190.23, 'Ir', 192.217, 'Pt', 195.084, 'Au', 196.9665, 'Hg', 200.59])
	arrayKit.pushArray(atomicMassSkips, ['Tl', 204.3833, 'Pb', 207.2, 'Bi', 208.9804, 'Po', 210, 'At', 210, 'Rn', 220])

	arrayKit.pushArray(atomicMassSkips, ['Fr', 223, 'Ra', 226])
	arrayKit.pushArray(atomicMassSkips, ['Ac', 227, 'Th', 232.0380, 'Pa', 231.0358, 'U', 238.0289, 'Np', 237, 'Pu', 244, 'Am', 243])
	arrayKit.pushArray(atomicMassSkips, ['Cm', 247, 'Bk', 247, 'Cf', 251, 'Es', 252, 'Fm', 257, 'Md', 258, 'No', 259])
	arrayKit.pushArray(atomicMassSkips, ['Lr', 262, 'Rf', 261, 'Db', 262, 'Sg', 266, 'Bh', 264])
	arrayKit.pushArray(atomicMassSkips, ['Hs', 277, 'Mt', 268, 'Ds', 271, 'Rg', 272, 'Cn', 285])
	arrayKit.pushArray(atomicMassSkips, ['Nh', 284, 'Fl', 289, 'Mc', 288, 'Lv', 292, 'Ts', 294, 'Og', 294])

	Science.atomicMassMap = mapKit.getMapBySkips(atomicMassSkips)
	return Science.atomicMassMap
},

getAtomicSetText: function(text) {
	var atomicSet = new Set()
	var conversions = []
	var elementCharacters = []
	var wasIntegerPlus = false
	for (var characterIndex = 0; characterIndex < text.length; characterIndex++) {
		var character = text[characterIndex]
		if (gUpperCaseSet.has(character)) {
			var atomicName = character
			var nextIndex = characterIndex + 1
			if (nextIndex < text.length) {
				var nextCharacter = text[nextIndex]
				if (gLowerCaseSet.has(nextCharacter)) {
					atomicName += nextCharacter
				}
			}
			atomicSet.add(atomicName)
		}
		var isIntegerPlus = Science.integerDotSet.has(character)
		if (isIntegerPlus && !wasIntegerPlus) {
			conversions.push('*')
		}
		if (Science.upperBracketSet.has(character)) {
			conversions.push('+')
		}
		conversions.push(character)
		wasIntegerPlus = isIntegerPlus
	}

	return {atomicSet:setKit.getSorted(atomicSet), conversionText:conversions.join('')}
},

getMassTableEntries: function(atomicSetText) {
	var atomicMassMap = Science.getAtomicMassMap()
	var entries = []
	for (var atomicName of atomicSetText.atomicSet) {
		var conversionText = atomicSetText.conversionText
		if (atomicMassMap.has(atomicName)) {
			for (var innerName of atomicSetText.atomicSet) {
				if (atomicMassMap.has(innerName)) {
					if (innerName == atomicName) {
						conversionText = conversionText.replaceAll(innerName, atomicMassMap.get(innerName))
					}
					else {
						conversionText = conversionText.replaceAll(innerName, 0)
					}
				}
			}
			entries.push([atomicName, evaluator.getValueByEquation(undefined, undefined, conversionText)])
		}
	}

	return entries
},

integerDotSet: new Set('.0123456789'.split('')),

mass: function(text) {
	return Science.massBySetText(Science.getAtomicSetText(text))
},

massBySetText: function(atomicSetText) {
	var atomicMassMap = Science.getAtomicMassMap()
	var conversionText = atomicSetText.conversionText
	for (var atomicName of atomicSetText.atomicSet) {
		if (atomicMassMap.has(atomicName)) {
			conversionText = conversionText.replaceAll(atomicName, atomicMassMap.get(atomicName))
		}
	}

	return evaluator.getValueByEquation(undefined, undefined, conversionText)
},

massProportion: function(text) {
	var atomicSetText = Science.getAtomicSetText(text)
	var entries = Science.getMassTableEntries(atomicSetText)
	var totalMass = Science.massBySetText(atomicSetText)
	for (var entry of entries) {
		entry[1] /= totalMass
	}

	return Object.fromEntries(entries)
},

massTable: function(text) {
	return Object.fromEntries(Science.getMassTableEntries(Science.getAtomicSetText(text)))
},

modifyObject_Private: function() {
	Science.mass.optionMap = gMapS
	Science.massProportion.optionMap = gMapS
	Science.massTable.optionMap = gMapS
},

upperBracketSet: new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ('.split(''))
}
