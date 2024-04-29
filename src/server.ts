import express from "express";
import { PrismaClient } from "@prisma/client";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/movies/filter", async (req, res) => {
    const { language, sort } = req.query;
    const languageName = language as string;
    const sortName = sort as string;

    let orderBy = {};
    if (sortName === "title") {
        orderBy = {
            title: "asc",
        };
    } else if (sortName === "release_date") {
        orderBy = {
            release_date: "asc",
        };
    }

    let where = {};
    if (languageName) {
        where = {
            languages: {
                name: {
                    equals: languageName,
                    mode: "insensitive",
                },
            },
        };
    }

    try {
        const movies = await prisma.movie.findMany({
            orderBy,
            where: where,
            include: {
                genres: true,
                languages: true,
            },
        });

        // Cálculo da quantidade total de filmes
        const totalMovies = movies.length;

        // Cálculo da média de duração dos filmes
        let totalDuration = 0;
        for (const movie of movies) {
            totalDuration += movie.duration ?? 0;  // Use o operador nullish coalescing para tratar 'null' como 0
        }
        const averageDuration = totalMovies > 0 ? totalDuration / totalMovies : 0;

        res.json({
            totalMovies,
            averageDuration,
            movies,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Houve um problema ao buscar os filmes." });
    }
});

app.post("/movies", async (req, res) => {

    const { tittle, genre_id, language_id, oscar_count, release_date } = req.body;
    try {

        // verificar no banco se já existe um filme com o nome que está sendo enviado

        // case insensitive - se a busca for feita por john wick ou John Wick ou JOHN WICK, o registro vai ser retornado na consulta 

        //case sensitive- se buscar por john wick e no banco estiver como John Wick não vai ser retornado na consulta

        const movieWithSameTitle = await prisma.movie.findFirst({
            where: { title: { equals: tittle, mode: "insensitive" } },
        });

        if (movieWithSameTitle) {
            return res.status(409).send({ message: "Já existe eum filme cadastrado com esse título" });
        }

        await prisma.movie.create({
            data: {
                title: tittle,
                genre_id: genre_id,
                language_id: language_id,
                oscar_count: oscar_count,
                release_date: new Date(release_date)
            }
        });
    } catch (error) {
        return res.status(500).send({ message: "Falha ao cadastrar um filme" });
    }

    res.status(201).send();
});

app.put("/movies/:id", async (req, res) => {
    // Pegar o ID do registro que vai ser atualizado;
    const id = Number(req.params.id);

    try {


        const movie = await prisma.movie.findUnique({
            where: {
                id
            }
        });

        if (!movie) {
            return res.status(404).send({ message: "Filme não encontrado!" });
        }

        const data = { ...req.body };
        data.release_date = data.release_date ? new Date(data.release_date) : undefined;
        console.log(data);

        // Pegar os dados do filme que vai ser atualizado e atualizar ele no prisma;
        await prisma.movie.update({
            where: {
                id
            },
            data: data
        });
    } catch (error) {
        return res.status(500).send({ message: "Falha ao tentar atualizar o registro do filme!" });
    }
    // Retornar o status correto informando que o filme foi atualizado;
    res.status(200).send();

});

app.delete("/movies/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({
            where: { id }
        });

        if (!movie) {
            return res.status(404).send({ message: "Filme não encontrado!" });
        }

        await prisma.movie.delete({
            where: { id }
        });

    } catch (error) {
        return res.status(500).send({ message: "Falha ao tentar deletar o registro do filme!" });
    }

    res.status(200).send();
});

app.get("/movies/:genderName", async (req, res) => {
    try {
        const moviesFilteredByGenderName = await prisma.movie.findMany({
            include: {
                genres: true,
                languages: true,
            },
            where: {
                genres: {
                    name: {
                        equals: req.params.genderName,
                        mode: "insensitive",
                    },
                },
            },
        });

        res.status(200).send(moviesFilteredByGenderName);
    } catch (error) {
        return res.status(500).send({ message: "Falha ao atualizar um filme" });
    }
});

app.put("/genres/:id", async (req, res) => {
    // Extrai o ID do parâmetro da URL e o nome do gênero do corpo da requisição
    const id = Number(req.params.id);
    const { name } = req.body;

    // Verifica se o nome do gênero foi enviado no corpo da requisição, se não foi, retorna um erro 400
    if (!name) {
        return res.status(400).send({ message: "Nome do gênero é obrigatório" });
    }

    // Tenta encontrar um gênero com o ID informado, se não encontrar, retorna um erro 404
    try {
        const genre = await prisma.genre.findUnique({
            where: { id }
        });

        if (!genre) {
            return res.status(404).send({ message: "Gênero não encontrado!" });
        }

        //Verifica se já existe um gênero com o nome informado, se existir, retorna um erro 409
        const existingGenre = await prisma.genre.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive"
                }
            }
        });

        if (existingGenre) {
            return res.status(409).send({ message: "Já existe um gênero cadastrado com esse nome" });
        }

        // Atualiza o gênero no banco de dados se não houver erros
        const updatedGenre = await prisma.genre.update({
            where: { id },
            data: { name }
        });

        res.status(200).send(updatedGenre);

    } catch (error) {
        return res.status(500).send({ message: "Falha ao atualizar um gênero" });
    }
});

app.post("/genres", async (req, res) => {
    // Extrai o nome do gênero do corpo da requisição
    const { name } = req.body;

    // Verifica se o nome do gênero foi enviado no corpo da requisição, se não foi, retorna um erro 400
    if (!name) {
        return res.status(400).send({ message: "Nome do gênero é obrigatório" });
    }

    // Verifica se já existe um gênero com o nome informado, se existir, retorna um erro 409
    try {
        const existingGenre = await prisma.genre.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive"
                }
            }
        });

        if (existingGenre) {
            return res.status(409).send({ message: "Já existe um gênero cadastrado com esse nome" });
        }

        // Cria um novo gênero no banco de dados se não houver erros
        const newGenre = await prisma.genre.create({
            data: { name }
        });

        res.status(201).send(newGenre);
    } catch (error) {
        return res.status(500).send({ message: "Falha ao cadastrar um gênero" });
    }
});

app.get("/genres", async (_, res) => {
    try {
        // Busca todos os gêneros no banco de dados
        const genres = await prisma.genre.findMany({
            orderBy: {
                name: "asc"
            }
        });

        res.json(genres);

    } catch (error) {
        return res.status(500).send({ message: "Falha ao buscar os gêneros" });
    }
});

app.delete("/genres/:id", async (req, res) => {
    // Extrai o ID do parâmetro da URL
    const id = Number(req.params.id);

    // Tenta encontrar um gênero com o ID informado, se não encontrar, retorna um erro 404
    try {
        const genre = await prisma.genre.findUnique({
            where: { id }
        });

        if (!genre) {
            return res.status(404).send({ message: "Gênero não encontrado!" });
        }

        // Tenta deletar o gênero do banco de dados, se houver algum erro, retorna um erro 500
        await prisma.genre.delete({
            where: { id }
        });

        res.status(200).send();

    } catch (error) {
        return res.status(500).send({ message: "Falha ao deletar um gênero" });
    }
});


app.listen(port, () => {
    console.log(`Servidor em execução em http://localhost:${port}`);
});