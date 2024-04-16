import express from "express";
import { PrismaClient } from "@prisma/client";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/movies", async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: {
            title: "asc"
        },
        include: {
            genres: true,
            languages: true
        }
    });
    res.json(movies);
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

app.listen(port, () => {
    console.log(`Servidor em execução em http://localhost:${port}`);
});