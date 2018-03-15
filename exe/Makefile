# Polyglot in make and nmake
# ref. https://stackoverflow.com/a/30906085
#\
!if 1 #\
# [[[nmake]]] \
CXX=cl #\
CXXFLAGS=/EHsc #\
LIBS=shlwapi.lib Advapi32.lib user32.lib Shell32.lib #\
RM=del #\
RMARGS=*.obj *.exe *.ilk *.pdb #\
LINKARG=-Fe#\
!else
# [[[make]]]
CXX=i686-w64-mingw32-g++
CXXFLAGS=-mwindows -static
LIBS=-lshlwapi
RM=-rm -rf
RMARGS=*.o *.exe
LINKARG= -o 
#\
!endif

all: SearchExtender.exe

clean:
	$(RM) $(RMARGS)

SearchExtender.exe: SearchExtender.cpp
	$(CXX) $(CXXFLAGS) $(LINKARG)SearchExtender.exe SearchExtender.cpp $(LIBS)
